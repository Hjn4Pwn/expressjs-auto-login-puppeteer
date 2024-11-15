const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");

const COOKIE_PATH = path.join(__dirname, "../data", "cookies.json");

const isCookieValid = (cookies) => {
  const currentTime = Math.floor(Date.now() / 1000);

  const importantCookies = cookies.filter(
    (cookie) =>
      cookie.name === "hacklike_session" ||
      cookie.name.startsWith("remember_web")
  );

  if (importantCookies.length === 0) {
    return false;
  }
  return importantCookies.every((cookie) => cookie.expires > currentTime);
};

exports.autoLogin = async (req, res) => {
  let browser, page;
  try {
    const cookieFileExists = await fs.stat(COOKIE_PATH).catch(() => false);

    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();

    if (cookieFileExists) {
      // Đọc nội dung của file cookies.json
      const cookieContent = await fs.readFile(COOKIE_PATH, "utf-8");

      // Chỉ parse nếu nội dung không rỗng
      if (cookieContent) {
        const savedCookies = JSON.parse(cookieContent);

        if (isCookieValid(savedCookies)) {
          await page.setCookie(...savedCookies);
          await page.goto(process.env.AUTO_LOGIN_URL);
          console.log("Login by cookie");
        } else {
          console.log("Cookie expired. Login by username and password");
          await loginWithCredentials(page);
        }
      } else {
        // Nếu file rỗng, thực hiện đăng nhập bằng username và password
        console.log("Cookie file is empty. Login by username and password");
        await loginWithCredentials(page);
      }
    } else {
      console.log("Cannot find cookie file. Login by username and password");
      await loginWithCredentials(page);
    }

    // Lấy cookie mới và lưu vào file
    const cookies = await page.cookies();
    await fs.writeFile(COOKIE_PATH, JSON.stringify(cookies, null, 2));
    console.log("Cookies saved to", COOKIE_PATH);

    // In thời hạn của từng cookie
    cookies.forEach((cookie) => {
      const expiresDate = new Date(cookie.expires * 1000); // Chuyển đổi từ UNIX timestamp sang định dạng ngày giờ
      console.log(`Cookie "${cookie.name}" expires on: ${expiresDate}`);
    });

    // Đóng trình duyệt
    await browser.close();

    // Trả về kết quả
    res.json({
      message: "Đăng nhập thành công!",
      cookies: cookies,
    });
  } catch (error) {
    if (browser) await browser.close();
    console.error("Lỗi khi đăng nhập:", error);
    res.status(500).send("Có lỗi xảy ra!");
  }
};

// Hàm đăng nhập bằng username và password
const loginWithCredentials = async (page) => {
  await page.goto(process.env.AUTO_LOGIN_URL);
  await page.type(
    process.env.AUTO_LOGIN_INPUT_USERNAME_ID,
    process.env.AUTO_LOGIN_USERNAME
  );
  await page.type(
    process.env.AUTO_LOGIN_INPUT_PASSWORD_ID,
    process.env.AUTO_LOGIN_PASSWORD
  );
  await page.click(process.env.AUTO_LOGIN_BUTTON_ID);
  await page.waitForNavigation();
};
