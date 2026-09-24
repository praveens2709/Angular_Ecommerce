const { sendMail } = require("./mailer");

const CLIENT_URL = () => process.env.CLIENT_URL || "http://localhost:4200";
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const layout = (title, body) => `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#222">
  <h2 style="color:#992603;font-family:Georgia,serif;margin-bottom:4px">DopeShope</h2>
  <h3 style="margin-top:0">${esc(title)}</h3>
  ${body}
  <p style="color:#888;font-size:12px;margin-top:32px">You're receiving this because of activity on your DopeShope account.</p>
</div>`;

exports.orderPlaced = (user, orders) => {
  const rows = orders
    .map((o) => {
      const p = o.products[0];
      return `<tr><td style="padding:6px 0">${esc(p.productName)}${p.size ? ` (${esc(p.size)})` : ""} × ${p.quantity}</td>
              <td style="text-align:right">${inr(o.totalAmount)}</td></tr>`;
    })
    .join("");
  const total = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  return sendMail({
    to: user.email,
    subject: "Your DopeShope order is confirmed",
    text: `Hi ${user.fullName}, we've received your order of ${orders.length} item(s), total ${inr(total)}.`,
    html: layout(
      "Thanks for your order!",
      `<p>Hi ${esc(user.fullName)}, we've received your order and will let you know when it ships.</p>
       <table style="width:100%;border-collapse:collapse">${rows}
         <tr><td style="border-top:1px solid #ddd;padding-top:8px"><b>Total</b></td>
             <td style="border-top:1px solid #ddd;text-align:right"><b>${inr(total)}</b></td></tr>
       </table>
       <p><a href="${CLIENT_URL()}/account/orders" style="color:#992603">View your orders</a></p>`
    ),
  });
};

const STATUS_COPY = {
  Shipped: "is on its way",
  Delivered: "has been delivered",
  Cancelled: "has been cancelled",
  "Return Requested": "return/exchange request was received",
  Returned: "return has been approved",
  "Return Rejected": "return request was declined",
};

exports.orderStatusChanged = (email, name, order) => {
  const product = order.products[0];
  const copy = STATUS_COPY[order.status] || `is now ${order.status}`;
  return sendMail({
    to: email,
    subject: `Order update: ${product.productName} ${copy}`,
    text: `Hi ${name}, your order for ${product.productName} ${copy}.`,
    html: layout(
      `Your order ${copy}`,
      `<p>Hi ${esc(name)}, your order for <b>${esc(product.productName)}</b>${
        product.size ? ` (size ${esc(product.size)})` : ""
      } ${esc(copy)}.</p>
       <p><a href="${CLIENT_URL()}/account/order-details/${order._id}" style="color:#992603">Track this order</a></p>`
    ),
  });
};

exports.passwordReset = (user, token) => {
  const link = `${CLIENT_URL()}/public/reset-password?token=${encodeURIComponent(token)}`;
  return sendMail({
    to: user.email,
    subject: "Reset your DopeShope password",
    text: `Reset your password (valid for 1 hour): ${link}`,
    html: layout(
      "Reset your password",
      `<p>Hi ${esc(user.fullName)}, click below to choose a new password. This link is valid for 1 hour.</p>
       <p><a href="${link}" style="display:inline-block;background:#992603;color:#fff;padding:10px 18px;text-decoration:none">Reset password</a></p>
       <p style="color:#666">If you didn't ask for this, you can ignore this email.</p>`
    ),
  });
};
