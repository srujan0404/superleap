import mongoose from 'mongoose';

export const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'];

const leadSchema = new mongoose.Schema(
  {
    name:   { type: String, required: true, trim: true },
    email:  { type: String, required: true, trim: true, lowercase: true,
              match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'invalid email'] },
    phone:  { type: String, trim: true },
    status: { type: String, enum: STATUSES, default: 'NEW', index: true },
    source: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false,
  },
);

leadSchema.set('toJSON', {
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

export const Lead = mongoose.model('Lead', leadSchema);
