const mongoose = require('mongoose');
const ContactMessage = require('../models/ContactMessage');
const { getStoreInfo } = require('../utils/store');
const { checkDelivery } = require('../utils/pincode');
const { sendMail } = require('../utils/mailer');
const { parsePaging } = require('../utils/pagination');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

exports.getStore = (req, res) => res.json(getStoreInfo());

exports.getPincode = async (req, res) => {
  const result = await checkDelivery(String(req.params.pincode || ''));
  res.status(result.valid ? 200 : 404).json(result);
};

exports.submitContact = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim();
    const message = String(req.body.message || '').trim();
    if (!name || !message) return res.status(400).json({ message: 'Please add your name and a message' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Please enter a valid email' });
    // Honeypot field that real people never fill in
    if (req.body.website) return res.status(201).json({ message: 'Thanks! We will get back to you soon.' });

    const saved = await ContactMessage.create({
      name,
      email,
      message,
      subject: String(req.body.subject || '').trim() || 'General enquiry',
      orderId: String(req.body.orderId || '').trim() || undefined,
    });

    const store = getStoreInfo();
    if (store.email) {
      sendMail({
        to: store.email,
        subject: `[Contact] ${saved.subject} — ${name}`,
        text: `${name} <${email}>${saved.orderId ? ` (order ${saved.orderId})` : ''}\n\n${message}`,
        html: `<p><b>${esc(name)}</b> &lt;${esc(email)}&gt;${saved.orderId ? ` · Order ${esc(saved.orderId)}` : ''}</p><p>${esc(message).replace(/\n/g, '<br>')}</p>`,
      });
    }
    sendMail({
      to: email,
      subject: `We received your message — ${store.name}`,
      text: `Hi ${name}, thanks for writing to us. We usually reply within 1–2 business days.`,
      html: `<p>Hi ${esc(name)}, thanks for writing to ${esc(store.name)}. We usually reply within 1–2 business days.</p>`,
    });
    res.status(201).json({ message: 'Thanks! We will get back to you soon.' });
  } catch (error) {
    res.status(500).json({ message: 'Could not send your message. Please try again.' });
  }
};

// ---------- Admin ----------

exports.listMessages = async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const paging = parsePaging(req.query, { defaultLimit: 20 }) || { skip: 0, limit: 50, page: 1 };
    const [items, total, unread] = await Promise.all([
      ContactMessage.find(filter).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit),
      ContactMessage.countDocuments(filter),
      ContactMessage.countDocuments({ status: 'New' }),
    ]);
    res.json({ items, total, unread, page: paging.page, limit: paging.limit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMessage = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Message not found' });
    const status = req.body.status === 'Resolved' ? 'Resolved' : 'New';
    const updated = await ContactMessage.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updated) return res.status(404).json({ message: 'Message not found' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
