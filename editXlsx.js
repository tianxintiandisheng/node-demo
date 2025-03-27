const xlsx = require("xlsx");
const winston = require("winston");

const filePath = "./12.xlsx";

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
    new winston.transports.File({ filename: "logs/error_xlsx.log", level: "error" }),
    new winston.transports.File({ filename: "logs/info_xlsx.log" }),
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

const getFlieContent = async () => {
  // 使用 xlsx.readFile 读取 Excel 文件
  const workbook = xlsx.readFile(filePath);

  // 获取工作表的名字
  const sheetNameList = workbook.SheetNames;

  const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetNameList[0]], { header: 1 }); // 将工作表转换为 数组
  console.log(`工作表名称: ${sheetNameList[0]}`);
  console.log(`数量: ${jsonData.length}`);
  console.log("数据:");
  console.log(jsonData.splice(0, 3));

  return jsonData;
};

const htmlText =
  '<!DOCTYPE html><html>\n  <head>\n  <meta name="viewport"content="width=device-width, initial-scale=1, maximum-scale=1">\n  <style>\n    #haojing_body {\n      margin: 0;\n      padding: 0 3%;\n      background-color: rgb(255,255,255);\n      color: black;\n      font-size: 16px;\n    }\n    #haojing_body a {\n      color: #2f54eb;\n      text-decoration: underline;\n    }\n    #haojing_body img {\n      max-width: 100%;\n    }\n    #haojing_body video {\n      max-width: 100%;\n    }\n    #haojing_body p {\n      word-break: break-all;\n      min-height: 1em;\n      margin: 0;\n      padding: 0;\n    }\n    #haojing_body hr{\n      display: block;\n      unicode-bidi: isolate;\n      margin-block-start: 0.5em;\n      margin-block-end: 0.5em;\n      margin-inline-start: auto;\n      margin-inline-end: auto;\n      overflow: hidden;\n      border-style: inset;\n      border-width: 1px;\n  }\n    #haojing_body h1{ font-size:2em; margin: .67em 0 }\n    #haojing_body h2{ font-size:1.5em; margin: .75em 0 }\n    #haojing_body h3{ font-size:1.17em; margin: .83em 0 }\n    #haojing_body h4, blockquote, ul,fieldset, form,ol, dl, dir,menu { margin: 1.12em 0}\n    #haojing_body h5 { font-size:.83em; margin: 1.5em 0 }\n    #haojing_body h6{ font-size:.75em; margin: 1.67em 0 }\n    #haojing_body h1, h2, h3, h4,h5, h6, b,strong  { font-weight: bolder }\n    #haojing_body.mobile {\n      font-size: 14px;\n    }\n    #haojing_body a::before {\n      background-repeat: no-repeat;\n      width: 1em;\n      height: 1em;\n      vertical-align: text-top;\n      display: inline-block;\n      content: "";\n      line-height: 1;\n      margin-right: 3px;\n    }\n    #haojing_body a[href]::before {\n      background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAEKADAAQAAAABAAAAEAAAAAA0VXHyAAABC0lEQVQ4EcVSMW7CQBCctULppA0i1LwlEr+ITAcFJQVPQInokOjyBxo+kipFHEQLuMXLrMOeDiQDqfDJ2tXdzNzN3AH3/uSWAzxP9VVKzAyrCXrrviyc9+DNpWpkVbwY5ijUdnziTV3tzDVVIPV1FZxwak9gxO0O/W2BIcnCsaHfggKZi1kNGUQ+RUssJUG3AiomjymmX2+yi4neB4Hmh+b02aoWBHtRjC8RXeDEj0/+pwYBXk8mgpz/L0p80tyQ/r+b7zqyPOpEg4VzgIdoQryFBteZH0PkRvE7qBVwQRPaFPiB4qmaS7BaD+QvK04EC044r5Y+dwk3wHDLGHNVwMD2fI/55NbHAvfvD7uQV+HAsyIfAAAAAElFTkSuQmCC");\n    }\n    #haojing_body a:not([href])::before {\n      background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAEKADAAQAAAABAAAAEAAAAAA0VXHyAAABj0lEQVQ4EcWQvUsDQRDFZy6JNhKIUcmHVhEstLKSCKJ2NmltbUQlJBcrUbAXBTWHEYyWNrbaKIJ/gGBtIwGj5CRR0ggqJje+A/dYJMQyB8vMzc7v7Zsh6vTH/xmIHcqI80076JtCcxVnu2LyieLaCsQOZFwadCVEfQBKzBQXoW7EJdvkoitiKKW/MW7JhNOkGxc2mNZfcpzwM40C/oLImupvKeDCTaFrNAUNg0xY3nKBcoZKEKxDJKQE/CrRI+A9Euphg5YBvEf3pWwEKBWzaB71CDGdqv6WDnA5hlO1s3yEJdUgMuQ0qIBaE69fGj7KKQFviRFL+qF+BsU7AEnMmYT9VCXLF9G8vOK/C3sIKlBFzwE7lIfADBo/sVoTL9UdohCEV1ALw/atgvSo72AOF7ad483fhl7Mvgo3uxCrkZ8yOqhyz4EwvWGe8GBBht1LwBsujNTG3bSd5nsF6dHbQdSSRXGoiMIHgArGSSB/8gVo9jnNDzqk554DbPwYcy7gPAIeQNM5B2iyHawLdS7/Aaa9g2B/Pz2tAAAAAElFTkSuQmCC");\n    }\n\n    #haojing_body .media-wrap.image-wrap a[href]::before {\n      background-image: none;\n    }\n    #haojing_body ul,\n    #haojing_body ol {\n      padding-left: 2em;\n    }\n    #haojing_body ul li {\n      list-style: disc;\n    }\n    #haojing_body ol li {\n      list-style: decimal;\n    }\n  .media-wrap + p {\n    min-height: 0px;\n    margin-bottom: 0px;\n  }\n  .media-wrap + p:empty {\n    display: none;\n  }\n  .image-wrap + p:empty {\n    display: none;\n  }\n\n  </style>\n  </head>\n  <body id="haojing_body"> <div id="editor-content-zh" style="background:rgb(255,255,255)">\n        <p style="margin:0;min-height:1.2em;"></p>\n      </div>\n  <div id="mark">\n  </div>\n  </body>\n  <script>\n      const isMobile = /Android|webOS|iPhone|iPod|BlackBerry/i.test(\n        navigator.userAgent,\n      );\n\n      if (isMobile) {\n        const __styleEle = document.getElementById("haojing_body");\n        __styleEle.className = "mobile";\n      }\n\n    </script>\n  </html>';

const getNewHtmlText = (_textToAdd, _htmlText) => _htmlText.replace(/(<p[^>]*>)/, `$1${_textToAdd}`);

function updateZhCnValue(data) {
  return data.map((row, indexNum) => {
    const updateStatement = row[0];
    const match = updateStatement.match(/SET `exhibitor_description` = '(\{.*?\})' WHERE/);
    if (!match || match.length < 2) {
      console.error("无法解析更新语句:", updateStatement);
      return [updateStatement];
    }

    let jsonStr = match[1];

    // 步骤1：处理转义字符（确保 JSON 字符串有效）
    jsonStr = jsonStr
      .replace(/\\\\/g, "\\") // 先处理双反斜杠，避免后续替换干扰
      .replace(/\\'/g, "'") // 处理单引号转义
      .replace(/\\"/g, '"') // 处理双引号转义
      .replace(/\n/g, "\\n") // 处理换行符
      .replace(/\r/g, ""); // 移除回车符

    // 校验 JSON 格式
    if (!jsonStr.startsWith("{") || !jsonStr.endsWith("}")) {
      console.error("JSON 字符串格式不完整:", jsonStr);
      logger.error(`JSON 格式不完整-行数:${indexNum}`);
      return [updateStatement];
    }

    let jsonObj;
    try {
      jsonObj = JSON.parse(jsonStr);
    } catch (e) {
      console.error("JSON 解析错误:", e.message);
      logger.error(`JSON 解析错误-行数:${indexNum}`);
      logger.error(`原始 JSON 字符串:\n${jsonStr}`);
      logger.error(`原始 SQL 语句:\n${updateStatement}`);
      return [updateStatement];
    }

    // 修改 'zh-cn' 和 'en-us' 的值
    if (jsonObj["zh-cn"] !== undefined) {
      jsonObj["zh-cn"] = getNewHtmlText(jsonObj["zh-cn"], htmlText);
    }
    if (jsonObj["en-us"] !== undefined) {
      jsonObj["en-us"] = getNewHtmlText(jsonObj["en-us"], htmlText);
    }

    // 步骤2：将修改后的 JSON 对象转回字符串并转义
    const updatedJsonStr = JSON.stringify(jsonObj);
    const escapedJson = updatedJsonStr.replace(/"/g, '\\"'); // 转义双引号以适配 SQL

    // 构建新的 SQL 语句
    const newUpdateStatement = updateStatement.replace(
      match[1], // 替换原始 JSON 字符串
      escapedJson
    );

    return [newUpdateStatement];
  });
}

async function main() {
  const startTime = Date.now(); // 开始时间记录
  const listArray = await getFlieContent();
  // listArray = listArray.slice(12); // 调试
  const newListArray = updateZhCnValue(listArray);

  // 将修改后的数组转回工作表
  const worksheet = xlsx.utils.aoa_to_sheet(newListArray);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "SQL_Statements");
  // 写入到新的 Excel 文件
  xlsx.writeFile(workbook, "sql_statements.xlsx");

  const endTime = Date.now(); // 结束时间记录
  const totalTimeInSeconds = (endTime - startTime) / 1000; // 总耗时（秒）
  logger.info(`总数: ${listArray.length}`);
  logger.info(`操作完成, 总共耗时: ${totalTimeInSeconds.toFixed(2)} 秒`);
}

main().catch(error => {
  logger.error("An error occurred during the main execution:", error);
});
