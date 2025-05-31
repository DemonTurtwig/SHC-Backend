// controllers/bookingController.ts
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  Subtype, ServiceType, Option,
  Pricing, Asset, TimeSlot,
} from '../models/applianceModel';

export const getBookingInitializeData = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    /* fetch everything in parallel ------------------------------------ */
    const [
      subtypes,
      allOptions,
      allPricings,
      allAssets,
      timeSlots,
      allServices,
    ] = await Promise.all([
      Subtype.find().populate('category serviceOptions'),
      Option.find(),
      Pricing.find(),
      Asset.find(),
      TimeSlot.find(),
      ServiceType.find(),
    ]);

    /* build payload ---------------------------------------------------- */
    const structuredSubtypes = await Promise.all(
      subtypes.map(async st => {
        const subtypeId = st._id as Types.ObjectId;

        /* ▶ enrich every service assigned to this subtype */
        const enriched = await Promise.all(
          st.serviceOptions.map(async rawSvc => {
            const svcId = new Types.ObjectId(rawSvc._id);
            const svcDoc = allServices.find(s => String(s._id) === String(svcId));
            if (!svcDoc) return null; // safety

            /* ① tiers -------------------------------------------------- */
            const prices = allPricings.filter(
              p => p.subtype.equals(subtypeId) && p.serviceType.equals(svcId),
            );

            if (prices.length === 0) return null; // nothing to render

            const tiers = prices.map(pr => {
              const blueprint = allAssets.find(
                a =>
                  a.subtype.equals(subtypeId) &&
                  a.serviceType.equals(svcId) &&
                  a.kind === 'blueprint' &&
                  a.tier === pr.tier,
              );

              const parts = allAssets.filter(
                a =>
                  a.subtype.equals(subtypeId) &&
                  a.serviceType.equals(svcId) &&
                  a.kind === 'part' &&
                  a.tier === pr.tier,
              );

              /* skip tier if no blueprint OR no parts (= nothing useful) */
              if (!blueprint && parts.length === 0) return null;

              return {
                tier: pr.tier,                     // standard / deluxe …
                price: pr.price,
                extraTime: pr.extraTime,
                assets: {
                  blueprint: blueprint?.url ?? null,
                  parts: parts.map(p => ({
                    label: p.label,
                    partId: p.partId,
                    url: p.url,
                  })),
                },
              };
            }).filter(Boolean); // strip nulls

            if (tiers.length === 0) return null;

            /* ② options (applyTo = this subtype) ---------------------- */
            const relatedOptions = allOptions.filter(opt =>
              opt.appliesTo.some(id => id.equals(subtypeId)),
            );

            return {
              _id: svcDoc._id,
              name: svcDoc.name,      // “clean”
              label: svcDoc.label,    // “세척”
              tiers,
              options: relatedOptions,
            };
          }),
        );

        const serviceOptions = enriched.filter(
          (svc): svc is NonNullable<typeof svc> => !!svc,
        );

        return {
          _id: st._id,
          name: st.name,
          iconUrl: st.iconUrl,
          category: st.category,
          serviceOptions,
        };
      }),
    );

    /* respond ---------------------------------------------------------- */
    res.json({
      subtypes: structuredSubtypes,
      timeSlots,
    });
  } catch (err) {
    console.error('Error in /booking/initialize:', err);
    res
      .status(500)
      .json({ message: '데이터를 불러오는데 실패했습니다.' });
  }
};
