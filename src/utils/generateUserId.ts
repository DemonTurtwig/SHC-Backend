import Counter from '../models/Counter';
import User from '../models/User';

export const generateUserId = async (): Promise<number> => {
  // ① Try normal increment first
  let counter = await Counter.findOneAndUpdate(
    { name: 'userId' },
    { $inc: { seq: 1 } },
    { new: true }
  );

  if (!counter) {
    const max = await User.findOne().sort({ userId: -1 }).select('userId').lean();
    const start = (Number(max?.userId) || 0) + 1;

    counter = await Counter.create({ name: 'userId', seq: start });
  }

  return counter.seq;
};
