/**
 * 刷数据
 * */ 


const axios = require("axios");
const fs = require("fs").promises;
const winston = require("winston");

const MAX_DEPTH = 10; // 设定最大递归深度
const DELAY_MS = 500; // 延时
const DOMAIN_NAME = "http://192.168.1.1:8080"; // 请求域名

const REQUEST_URL_GET_LIST = "/api/getList"; // 获取列表
const REQUEST_URL_EDIT_DETAIL = "/api/edit"; // 编辑耽搁
const LIMIT_CONCURRENT_REQUESTS = 5; // 设置并发请求的最大数量
const TenantId = "1";
const ExhibitionId =  "2";
const GroupId = "3";
const BrandId = "4";
const Token = "5";

// 创建一个带有默认配置的axios实例
const axiosInstance = axios.create({
  baseURL: DOMAIN_NAME,
  // 在这里设置全局的默认请求头,避免被服务器识别为爬虫并拒绝服务
  headers: {
    "User-Agent": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
    Referer: "https://tds-referer-url.com",
    "X-Access-Lang": "zh-cn",
    Authorization: Token,
    "X-Ca-Exhibition-Id": ExhibitionId,
    "X-Ca-Tenant-Id": TenantId,
    "X-Ca-Group-Id": GroupId,
    "X-Ca-Brand-Id": BrandId
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
    new winston.transports.File({ filename: "logs/combined_exhibitor.log" }),
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
    const list = response.data.resultInfo;
    if (Array.isArray(list)) {
      return list;
    }
    return [];
  } catch (error) {
    logger.error("Error-获取列表:", error);
    return [];
  }
}

const htmlText =
  '<!DOCTYPE html><html>\n  <head>\n  <meta name="viewport"content="width=device-width, initial-scale=1, maximum-scale=1">\n  <style>\n    #haojing_body {\n      margin: 0;\n      padding: 0 3%;\n      background-color: rgb(255,255,255);\n      color: black;\n      font-size: 16px;\n    }\n    #haojing_body a {\n      color: #2f54eb;\n      text-decoration: underline;\n    }\n    #haojing_body img {\n      max-width: 100%;\n    }\n    #haojing_body video {\n      max-width: 100%;\n    }\n    #haojing_body p {\n      word-break: break-all;\n      min-height: 1em;\n      margin: 0;\n      padding: 0;\n    }\n    #haojing_body hr{\n      display: block;\n      unicode-bidi: isolate;\n      margin-block-start: 0.5em;\n      margin-block-end: 0.5em;\n      margin-inline-start: auto;\n      margin-inline-end: auto;\n      overflow: hidden;\n      border-style: inset;\n      border-width: 1px;\n  }\n    #haojing_body h1{ font-size:2em; margin: .67em 0 }\n    #haojing_body h2{ font-size:1.5em; margin: .75em 0 }\n    #haojing_body h3{ font-size:1.17em; margin: .83em 0 }\n    #haojing_body h4, blockquote, ul,fieldset, form,ol, dl, dir,menu { margin: 1.12em 0}\n    #haojing_body h5 { font-size:.83em; margin: 1.5em 0 }\n    #haojing_body h6{ font-size:.75em; margin: 1.67em 0 }\n    #haojing_body h1, h2, h3, h4,h5, h6, b,strong  { font-weight: bolder }\n    #haojing_body.mobile {\n      font-size: 14px;\n    }\n    #haojing_body a::before {\n      background-repeat: no-repeat;\n      width: 1em;\n      height: 1em;\n      vertical-align: text-top;\n      display: inline-block;\n      content: "";\n      line-height: 1;\n      margin-right: 3px;\n    }\n    #haojing_body a[href]::before {\n      background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAEKADAAQAAAABAAAAEAAAAAA0VXHyAAABC0lEQVQ4EcVSMW7CQBCctULppA0i1LwlEr+ITAcFJQVPQInokOjyBxo+kipFHEQLuMXLrMOeDiQDqfDJ2tXdzNzN3AH3/uSWAzxP9VVKzAyrCXrrviyc9+DNpWpkVbwY5ijUdnziTV3tzDVVIPV1FZxwak9gxO0O/W2BIcnCsaHfggKZi1kNGUQ+RUssJUG3AiomjymmX2+yi4neB4Hmh+b02aoWBHtRjC8RXeDEj0/+pwYBXk8mgpz/L0p80tyQ/r+b7zqyPOpEg4VzgIdoQryFBteZH0PkRvE7qBVwQRPaFPiB4qmaS7BaD+QvK04EC044r5Y+dwk3wHDLGHNVwMD2fI/55NbHAvfvD7uQV+HAsyIfAAAAAElFTkSuQmCC");\n    }\n    #haojing_body a:not([href])::before {\n      background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAEKADAAQAAAABAAAAEAAAAAA0VXHyAAABj0lEQVQ4EcWQvUsDQRDFZy6JNhKIUcmHVhEstLKSCKJ2NmltbUQlJBcrUbAXBTWHEYyWNrbaKIJ/gGBtIwGj5CRR0ggqJje+A/dYJMQyB8vMzc7v7Zsh6vTH/xmIHcqI80076JtCcxVnu2LyieLaCsQOZFwadCVEfQBKzBQXoW7EJdvkoitiKKW/MW7JhNOkGxc2mNZfcpzwM40C/oLImupvKeDCTaFrNAUNg0xY3nKBcoZKEKxDJKQE/CrRI+A9Euphg5YBvEf3pWwEKBWzaB71CDGdqv6WDnA5hlO1s3yEJdUgMuQ0qIBaE69fGj7KKQFviRFL+qF+BsU7AEnMmYT9VCXLF9G8vOK/C3sIKlBFzwE7lIfADBo/sVoTL9UdohCEV1ALw/atgvSo72AOF7ad483fhl7Mvgo3uxCrkZ8yOqhyz4EwvWGe8GBBht1LwBsujNTG3bSd5nsF6dHbQdSSRXGoiMIHgArGSSB/8gVo9jnNDzqk554DbPwYcy7gPAIeQNM5B2iyHawLdS7/Aaa9g2B/Pz2tAAAAAElFTkSuQmCC");\n    }\n\n    #haojing_body .media-wrap.image-wrap a[href]::before {\n      background-image: none;\n    }\n    #haojing_body ul,\n    #haojing_body ol {\n      padding-left: 2em;\n    }\n    #haojing_body ul li {\n      list-style: disc;\n    }\n    #haojing_body ol li {\n      list-style: decimal;\n    }\n  .media-wrap + p {\n    min-height: 0px;\n    margin-bottom: 0px;\n  }\n  .media-wrap + p:empty {\n    display: none;\n  }\n  .image-wrap + p:empty {\n    display: none;\n  }\n\n  </style>\n  </head>\n  <body id="haojing_body"> <div id="editor-content-zh" style="background:rgb(255,255,255)">\n        <p style="margin:0;min-height:1.2em;"></p>\n      </div>\n  <div id="mark">\n  </div>\n  </body>\n  <script>\n      const isMobile = /Android|webOS|iPhone|iPod|BlackBerry/i.test(\n        navigator.userAgent,\n      );\n\n      if (isMobile) {\n        const __styleEle = document.getElementById("haojing_body");\n        __styleEle.className = "mobile";\n      }\n\n    </script>\n  </html>';

const getNewHtmlText = (_textToAdd, _htmlText) => _htmlText.replace(/(<p[^>]*>)/, `$1${_textToAdd}`);

/**
 * @function 修改展商详情内容
 * @description 每一章节内容是完整的
 */
async function editChapterContent(params) {
  try {
    const paramsEdit = {
      exhibitorId: params.exhibitorId,
      exhibitorDescriptionImage: {},
      exhibitorDescription: params.exhibitorDescription
    };
    if (params.exhibitorDescription?.["zh-cn"]) {
      paramsEdit.exhibitorDescriptionImage["zh-cn"] = getNewHtmlText(params.exhibitorDescription["zh-cn"], htmlText);
    }
    if (params.exhibitorDescription?.["en-us"]) {
      paramsEdit.exhibitorDescriptionImage["en-us"] = getNewHtmlText(params.exhibitorDescription["en-us"], htmlText);
    }
    const response = await axiosInstance.put(REQUEST_URL_EDIT_DETAIL, paramsEdit);
    // 获取当前展商图文介绍
    return {
      exhibitorId: params.exhibitorId,
      exhibitorDescription: params.exhibitorDescription,
      success: response.data.success,
      tenantId: TenantId
    };
  } catch (error) {
    logger.error("修改展商详情内容-editChapterContent:", error);
    return "";
  }
}

/**
 * @function 循环调用编辑详情接口
 */
async function forEditFile(chapters) {
  const totalChapters = chapters.length;
  const allContentPromises = chapters.map(item =>
    editChapterContent({
      exhibitorId: item.exhibitorId,
      exhibitorDescription: item.exhibitorDescription
    })
  );
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
    chapterLinks = chapterLinks.slice(0, 3);
  }
  // chapterLinks = chapterLinks.slice(0, 2);
  // const list = await saveToFile(chapterLinks);
  await forEditFile(chapterLinks);
  const endTime = Date.now(); // 结束时间记录
  const totalTimeInSeconds = (endTime - startTime) / 1000; // 总耗时（秒）
  logger.info(`总数: ${chapterLinks.length}`);
  // logger.info(`需要处理数量: ${list.length}`);
  logger.info(`最大递归深度: ${MAX_DEPTH}`);
  logger.info(`延迟时间: ${DELAY_MS}毫秒`);
  logger.info(`并发请求的最大数量: ${LIMIT_CONCURRENT_REQUESTS}`);
  logger.info(`操作完成, 总共耗时: ${totalTimeInSeconds.toFixed(2)} 秒`);
}

main().catch(error => {
  logger.error("An error occurred during the main execution:", error);
});
