import mongoose from 'mongoose';
import { toJSON } from './plugins/index.js';

const personSchema = new mongoose.Schema(
  {
    tmdbId: { type: Number, required: true, unique: true },
    name: { type: String, required: true, trim: true, index: true },
    profileUrl: { type: String, default: '' },
    knownForDepartment: { type: String, default: '' },
  },
  { timestamps: true }
);

personSchema.plugin(toJSON);

const Person = mongoose.model('Person', personSchema);
export default Person;
