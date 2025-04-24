import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  Subtype,
  ServiceType,
  Option,
  Pricing,
  Asset,
  TimeSlot
} from '../models/applianceModel';

export const getBookingInitializeData = async (req: Request, res: Response): Promise<void> => {
  try {
    const [subtypes, options, pricings, assets, timeSlots, services] = await Promise.all([
      Subtype.find().populate('category serviceOptions'),
      Option.find(),
      Pricing.find(),
      Asset.find(),
      TimeSlot.find(),
      ServiceType.find()
    ]);

    const structuredSubtypes = await Promise.all(subtypes.map(async (subtype) => {
      const subtypeId = subtype._id as Types.ObjectId;
      const enrichedServices = await Promise.all(
        subtype.serviceOptions.map(async (service) => {
          const serviceId = new Types.ObjectId(service._id);
          const fullService = services.find(s => String(s._id) === String(serviceId))

          const matchedPricings = pricings.filter(p =>
            p.subtype.equals(subtypeId) && p.serviceType.equals(serviceId)
          );

          const tiers = matchedPricings.map(pr => {
            const blueprint = assets.find(a =>
              a.subtype.equals(subtypeId) &&
              a.serviceType.equals(serviceId) &&
              a.kind === 'blueprint' &&
              a.tier === pr.tier
            );

            const parts = assets.filter(a =>
              a.subtype.equals(subtypeId) &&
              a.serviceType.equals(serviceId) &&
              a.kind === 'part' &&
              a.tier === pr.tier
            );

            return {
              tier: pr.tier,
              price: pr.price,
              extraTime: pr.extraTime,
              assets: {
                blueprint: blueprint?.url || null,
                parts: parts.map(p => ({
                  label: p.label,
                  partId: p.partId,
                  url: p.url
                }))
              }
            };
          });

          const relatedOptions = options.filter(opt =>
            opt.appliesTo.some(id => id.equals(subtypeId))
          );

          return {
            _id: fullService?._id,
            name: fullService?.name,
            label: fullService?.label,
            tiers,
            options: relatedOptions
          };
        })
      );

      return {
        _id: subtype._id,
        name: subtype.name,
        category: subtype.category,
        serviceOptions: enrichedServices
      };
    }));

    res.json({
      subtypes: structuredSubtypes,
      timeSlots
    });
  } catch (err) {
    console.error('Error in /booking/initialize:', err);
    res.status(500).json({ message: 'Failed to load booking data.' });
  }
};
