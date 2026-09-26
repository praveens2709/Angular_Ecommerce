// The mailer picks its provider when loaded, so each test loads a fresh copy with its own env
const savedEnv = { ...process.env };
const loadMailer = (env) => {
  Object.assign(process.env, env);
  let mailer;
  jest.isolateModules(() => {
    mailer = require("../utils/mailer");
  });
  return mailer;
};

afterEach(() => {
  process.env = { ...savedEnv };
  jest.restoreAllMocks();
});

test("with BREVO_API_KEY, mail goes through Brevo's HTTPS API", async () => {
  const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({ ok: true, text: async () => "" });
  jest.spyOn(console, "log").mockImplementation(() => {});
  const { sendMail, devMode } = loadMailer({ BREVO_API_KEY: "test-key", MAIL_FROM: "DopeShope <orders@dopeshope.co.in>" });
  expect(devMode).toBe(false);

  await sendMail({ to: "shopper@example.com", subject: "Your order", html: "<p>Hi</p>", text: "Hi" });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toBe("https://api.brevo.com/v3/smtp/email");
  expect(options.headers["api-key"]).toBe("test-key");
  expect(JSON.parse(options.body)).toEqual({
    sender: { name: "DopeShope", email: "orders@dopeshope.co.in" },
    to: [{ email: "shopper@example.com" }],
    subject: "Your order",
    htmlContent: "<p>Hi</p>",
    textContent: "Hi",
  });
});

test("a failed send is logged, never thrown", async () => {
  jest.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 401, text: async () => "Key not found" });
  const errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
  const { sendMail } = loadMailer({ BREVO_API_KEY: "bad-key" });

  await expect(sendMail({ to: "shopper@example.com", subject: "Your order", text: "Hi" })).resolves.toBeUndefined();
  expect(errorLog.mock.calls[0].join(" ")).toMatch(/Brevo API 401: Key not found/);
  expect(errorLog.mock.calls[0].join(" ")).toMatch(/sh\*\*\*@example\.com/);
});

test("sender address parsing", () => {
  const { parseFrom } = loadMailer({});
  expect(parseFrom("DopeShope <orders@dopeshope.co.in>")).toEqual({ name: "DopeShope", email: "orders@dopeshope.co.in" });
  expect(parseFrom('"Dope Shope" <a@b.co>')).toEqual({ name: "Dope Shope", email: "a@b.co" });
  expect(parseFrom("orders@dopeshope.co.in")).toEqual({ email: "orders@dopeshope.co.in" });
});
