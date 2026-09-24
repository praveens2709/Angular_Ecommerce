const mongoose = require('mongoose');

/** Named sequences, e.g. invoice numbers per financial year */
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

CounterSchema.statics.next = async function (name) {
  const counter = await this.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return counter.seq;
};

module.exports = mongoose.model('Counter', CounterSchema);
