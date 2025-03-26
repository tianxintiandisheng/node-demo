const axios = require("axios");
const fs = require("fs").promises;
const winston = require("winston");

const MAX_DEPTH = 10; // 设定最大递归深度
const DELAY_MS = 1000; // 设定最大递归深度
const DOMAIN_NAME = "https://tds-referer-url.com"; // 请求域名

const REQUEST_URL_GET_LIST = `${DOMAIN_NAME}/api/getList`; // 列表目录
const REQUEST_URL_GET_DETAIL = `${DOMAIN_NAME}/api/detail`; 
const REQUEST_URL_EDIT_DETAIL = `${DOMAIN_NAME}/api/edit`; // 列表目录
const LIMIT_CONCURRENT_REQUESTS = 5; // 设置并发请求的最大数量

// 创建一个带有默认配置的axios实例
const axiosInstance = axios.create({
  // 在这里设置全局的默认请求头,避免被服务器识别为爬虫并拒绝服务
  headers: {
    "User-Agent": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
    Referer: "https://tds-referer-url.com",
    "X-Access-Lang": "zh-cn",
    Authorization:
      "Authorization",
    "X-Ca-Exhibition-Id": "123",
    "X-Ca-Tenant-Id": "456",
    "X-Ca-Group-Id": "789",
    "X-Ca-Brand-Id": "000"
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
    new winston.transports.File({ filename: "logs/error_exhibitor.log", level: "error" }),
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

/**
 * @function 全局接口报错处理
 * @dsc handling error in response interceptor
 * */
const HandleErr = async response => {
  const data = await response.data;
  // 权限失效处理
  if (data && !data.success) {
    if (data.errMsg) {
      logger.error(`HandleErr-接口异常:${data.errMsg}`);
    } else {
      logger.error("HandleErr-未知错误");
    }
    return response;
  }

  return response;
};

// 响应拦截器
axiosInstance.interceptors.response.use(HandleErr);

// 模拟延迟
function delay() {
  return new Promise(resolve => setTimeout(resolve, DELAY_MS));
}
/**
 * @function 获取列表
 * */
async function fetchChapterList() {
  try {
    const response = await axiosInstance.get(REQUEST_URL_GET_LIST, {
      pageNum: 1,
      pageSize: 999
    });
    const list = response.data.resultInfo.records;
    if (Array.isArray(list)) {
      return list;
    }
    return [];
  } catch (error) {
    logger.error("Error-获取列表:", error);
    return [];
  }
}

/**
 * @function 获取展商详情内容
 * @description 每一章节内容是完整的
 */
async function fetchChapterContent(exhibitorId, exhibitorName) {
  try {
    const response = await axiosInstance.get(
      `${REQUEST_URL_GET_DETAIL}/${exhibitorId}`
    );
    // const $ = cheerio.load(response.data);
    // 获取当前展商图文介绍
    return {
      exhibitorId,
      exhibitorName,
      exhibitorDescriptionImage: response.data.resultInfo.exhibitorDescriptionImage
    };
  } catch (error) {
    logger.error("Error fetching chapter content:", error);
    return undefined;
  }
}

/**
 * @function 修改展商详情内容
 * @description 每一章节内容是完整的
 */
async function editChapterContent(params) {
  try {
    const response = await axiosInstance.put(
      REQUEST_URL_EDIT_DETAIL,
      params
    );
    // 获取当前展商图文介绍
    return {
      exhibitorId: params.exhibitorId,
      success: response.data.success
    };
  } catch (error) {
    logger.error("修改展商详情内容-editChapterContent:", error);
    return "";
  }
}

/**
 * @function 循环调用查询详情接口
 */
async function saveToFile(chapters) {
  const totalChapters = chapters.length;
  const allContentPromises = chapters.map(item => fetchChapterContent(item.exhibitorId, item.organizationName));

  let allContent = []; // 使用allContent累积内容

  for (let i = 0; i < allContentPromises.length; i += LIMIT_CONCURRENT_REQUESTS) {
    const batchPromises = allContentPromises.slice(i, i + LIMIT_CONCURRENT_REQUESTS);
    await delay();

    const batchResults = await Promise.all(
      batchPromises.map(p => p.catch(err => logger.error(`Error in batch: ${err}`)))
    );

    allContent = [...allContent, ...batchResults];

    // 使用allContent写入文件，每次完成一个批次就保存一次
    await fs.writeFile("chapters.text", JSON.stringify(allContent), "utf8");

    // 打印进度
    let curChapterNum = i + LIMIT_CONCURRENT_REQUESTS;
    curChapterNum = curChapterNum >= totalChapters ? totalChapters : curChapterNum;
    const progress = (curChapterNum / totalChapters) * 100;
    process.stdout.write(`\r处理进度: ${progress.toFixed(2)}%`);
  }
  process.stdout.write("\n");
}

/**
 * @function 循环调用编辑详情接口
 */
async function forEditFile(chapters) {
  const totalChapters = chapters.length;
  const allContentPromises = chapters.map(item => editChapterContent(item.exhibitorId, item.organizationName));

  let allContent = []; // 使用allContent累积内容

  for (let i = 0; i < allContentPromises.length; i += LIMIT_CONCURRENT_REQUESTS) {
    const batchPromises = allContentPromises.slice(i, i + LIMIT_CONCURRENT_REQUESTS);
    await delay();

    const batchResults = await Promise.all(
      batchPromises.map(p => p.catch(err => logger.error(`Error in batch: ${err}`)))
    );

    allContent = [...allContent, ...batchResults];

    // 使用allContent写入文件，每次完成一个批次就保存一次
    await fs.writeFile("chapters_edit.text", JSON.stringify(allContent), "utf8");

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

  let chapterLinks = await fetchChapterList();
  const argList = process.argv.slice(2); // 获取用户在命令行中输入的参数
  if (argList.length > 0 && argList.includes("test")) {
    // 小范围测试
    chapterLinks = chapterLinks.slice(12);
  }
  console.log("🚀 ~ main ~ chapterLinks:", chapterLinks);
  const list = await saveToFile(chapterLinks);
  await forEditFile(list);
  const endTime = Date.now(); // 结束时间记录
  const totalTimeInSeconds = (endTime - startTime) / 1000; // 总耗时（秒）
  logger.info(`总数: ${chapterLinks.length}`);
  logger.info(`需要处理数量: ${list.length}`);
  logger.info(`最大递归深度: ${MAX_DEPTH}`);
  logger.info(`延迟时间: ${DELAY_MS}毫秒`);
  logger.info(`并发请求的最大数量: ${LIMIT_CONCURRENT_REQUESTS}`);
  logger.info(`操作完成, 总共耗时: ${totalTimeInSeconds.toFixed(2)} 秒`);
}

main().catch(error => {
  logger.error("An error occurred during the main execution:", error);
});
