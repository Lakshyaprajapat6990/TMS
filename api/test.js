
import dbConnect from '../lib/mongodb';

export default async function handler(req, res) {
  try {
    await dbConnect();
    return res.json({ message: 'MongoDB connected successfully!' });
  } catch (err) {
    return res.status(500).json({ message: err.message, stack: err.stack });
  }
}


