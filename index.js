const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs").promises;
const winston = require("winston");

const MAX_DEPTH = 10; // 设定最大递归深度
const CHAPTER_LIST_URL = "http://www.xtangsanshu.com/zaoansanguodagongren/"; // 列表目录
const DELAY_MS = 1000; // 延迟时间
const LIMIT_CONCURRENT_REQUESTS = 5; // 设置并发请求的最大数量

// 创建一个带有默认配置的axios实例
const axiosInstance = axios.create({
  // 在这里设置全局的默认请求头,避免被服务器识别为爬虫并拒绝服务
  headers: {
    "User-Agent": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
    Referer: "https://tds-referer-url.com"
  }
});

// 配置日志
const logger = winston.createLogger({
  level: "info", // 设置日志级别，默认为info(silly, debug, verbose, info, warn, error)
  format: winston.format.combine(
    // 添加时间戳格式化
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), // 自定义时间格式
    // 可以根据需要添加其他格式化选项，如prettyPrint等
    winston.format.json() // 示例中使用JSON格式输出，也可以根据需要调整
  ),
  transports: [
    // 配置日志输出到文件
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({
      // 为winston添加一个console传输，让我们在控制台也可以看到日志
      // format: winston.format.simple() // 简单文本格式
      format: winston.format.combine(
        winston.format.colorize(), // 颜色高亮不同级别日志
        winston.format.simple() // 使用简单的文本格式
      )
    })
  ]
});

// 模拟延迟
function delay() {
  return new Promise(resolve => setTimeout(resolve, DELAY_MS));
}

async function fetchChapterList(url) {
  try {
    const response = await axiosInstance.get(url);
    const $ = cheerio.load(response.data);
    const chapterLinks = $(".listmain dl dd a")
      .map((_, elem) => ({
        chapterName: $(elem).text(),
        url: "http://www.xtangsanshu.com" + $(elem).attr("href")
      }))
      .get();
    return chapterLinks;
  } catch (error) {
    logger.error("Error fetching chapter list:", error);
    return [];
  }
}

/**
 * @function 递归获取每一章节内容
 * @description 每一章节内容是分页展示，需要递归拼接
 */
async function fetchChapterContentAndNext(chapterUrl, currentChapterName = "未知章节", depth = 0) {
  if (depth >= MAX_DEPTH) {
    logger.warn(`\n warn 达到最大递归深度 ${MAX_DEPTH}, 停止抓取后续章节.`);
    logger.warn(`\n 错误章节名称:${currentChapterName}`);
    logger.warn(`\n 错误章节地址:${chapterUrl}`);
    return "";
  }
  try {
    const response = await axiosInstance.get(chapterUrl);
    const $ = cheerio.load(response.data);

    // 获取当前章节当前页内容
    const content = $(".content dd").text();

    // 页面内是否存在下一章的按钮
    const withNextButton = !!$('.pager a:contains("下一章")').first().attr("href");
    const withEndButton = !!$('.pager a:contains("看完了")').first().attr("href");
    if (withNextButton || withEndButton) {
      // 下一章的按钮存在，说明当前章节已结束
      return `${currentChapterName}${content}`;
    } else {
      // 下一章的按钮不存在，继续请求下一页的内容
      var parts = chapterUrl.split(/(\/[^\/]+)\.html$/);
      const urlArr = parts[1].split("_");
      let nextPageKey = urlArr[0];
      if (urlArr.length > 1) {
        nextPageKey = `${urlArr[0]}_${Number(urlArr[1]) + 1}`; // 构造下一章URL
      } else {
        nextPageKey = `${urlArr[0]}_2`;
      }
      const nextPageLink = `${parts[0]}${nextPageKey}.html`;
      const nextContent = await fetchChapterContentAndNext(nextPageLink, currentChapterName, depth + 1);
      return `${content}${nextContent}`;
    }
  } catch (error) {
    logger.error("Error fetching chapter content:", error);
    return "";
  }
}

/**
 * @function 获取章节内容
 * @description 每一章节内容是完整的
 */
async function fetchChapterContent(chapterUrl, currentChapterName = "未知章节") {
  try {
    const response = await axiosInstance.get(chapterUrl);
    const $ = cheerio.load(response.data);
    // 获取当前章节当前页内容
    const content = $(".showtxt").text();
    return `${currentChapterName}\n${content}`;
  } catch (error) {
    logger.error("Error fetching chapter content:", error);
    return "";
  }
}

async function saveToFile(chapters) {
  const totalChapters = chapters.length;
  const allContentPromises = chapters.map(item => fetchChapterContent(item.url, item.chapterName));

  let allContent = ""; // 使用allContent累积内容

  for (let i = 0; i < allContentPromises.length; i += LIMIT_CONCURRENT_REQUESTS) {
    const batchPromises = allContentPromises.slice(i, i + LIMIT_CONCURRENT_REQUESTS);
    await delay();

    const batchResults = await Promise.all(
      batchPromises.map(p => p.catch(err => logger.error(`Error in batch: ${err}`)))
    );

    batchResults.forEach(content => {
      allContent += content || "";
    });

    // 使用allContent写入文件，每次完成一个批次就保存一次
    await fs.writeFile("chapters.txt", allContent, "utf8");

    // 打印进度
    let curChapterNum = i + LIMIT_CONCURRENT_REQUESTS;
    curChapterNum = curChapterNum >= totalChapters ? totalChapters : curChapterNum;
    const progress = (curChapterNum / totalChapters) * 100;
    process.stdout.write(`\r处理进度: ${progress.toFixed(2)}%`);
  }
  process.stdout.write("\n");
}

async function main() {
  const startTime = Date.now(); // 开始时间记录

  let chapterLinks = await fetchChapterList(CHAPTER_LIST_URL);
  const argList = process.argv.slice(2); // 获取用户在命令行中输入的参数
  if (argList.length > 0 && argList.includes("test")) {
    // 小范围测试
    chapterLinks = chapterLinks.slice(12);

  }
  console.log("🚀 ~ main ~ chapterLinks:", chapterLinks);
  await saveToFile(chapterLinks);
  const endTime = Date.now(); // 结束时间记录
  const totalTimeInSeconds = (endTime - startTime) / 1000; // 总耗时（秒）
  logger.info(`处理章节数量: ${chapterLinks.length}`);
  logger.info(`最大递归深度: ${MAX_DEPTH}`);
  logger.info(`延迟时间: ${DELAY_MS}毫秒`);
  logger.info(`并发请求的最大数量: ${LIMIT_CONCURRENT_REQUESTS}`);
  logger.info(`操作完成, 总共耗时: ${totalTimeInSeconds.toFixed(2)} 秒`);
}

main().catch(error => {
  logger.error("An error occurred during the main execution:", error);
});
