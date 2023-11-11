import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  mongoose.set({ strictQuery: true });
  mongoose.connect(uri!);

  const host = mongoose.connection.getClient().options.srvHost;
  console.log(`MongoDB Connected: ${host}`.cyan.underline.bold);
};
