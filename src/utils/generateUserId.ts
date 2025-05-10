import Counter from '../models/Counter';
import User    from '../models/User';

export const generateUserId = async (): Promise<number> => {
  const maxCounter = await Counter.findById('userId');
  const maxId = maxCounter?.seq ?? 0;

  // Fetch all existing userIds up to max
  const existingIds = await User.find({ userId: { $lte: maxId } }, 'userId').lean();
  const taken = new Set(existingIds.map(u => u.userId));

  // Look for the lowest missing number
  for (let i = 1; i <= maxId; i++) {
    if (!taken.has(i)) return i;
  }

  // If no gap, increment counter and return next
  const counter = await Counter.findByIdAndUpdate(
    'userId',
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );

  return counter.seq;
};
