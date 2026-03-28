import { InferSchemaType, Model, Schema, models, model } from 'mongoose';
import { UserRole } from '../types/auth';

const allowedRoles: UserRole[] = ['builder', 'land_owner', 'admin'];

const userSchema = new Schema(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    name: { type: String, required: true },
    picture: { type: String, default: '' },
    role: { type: String, enum: allowedRoles, required: true },
    isApproved: { type: Boolean, default: false, index: true },
    adhaarNumber: { type: String, default: '' },
    phoneNumber: { type: String, default: '' },
    address: { type: String, default: '' },
    country: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
    registrationComplete: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const UserModel: Model<UserDocument> =
  (models.User as Model<UserDocument> | undefined) ?? model<UserDocument>('User', userSchema);
