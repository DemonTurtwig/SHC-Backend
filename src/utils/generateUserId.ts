import Counter from '../models/Counter';

export const generateUserId = async (): Promise<number> => {
  const counter = await Counter.findOneAndUpdate(
    { name: 'userId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};