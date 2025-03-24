# 背景
网上很多小说只能在线观看，没有下载功能，正好最近在学习node.js，就想着是否能用node写个脚本，批量获取每一章节的内容然后整合成txt并输出

# 网页结构分析

## 章节列表结构分析
我的请求地址是`http://m.biquge.net/book/107056/chapterlist`，返回的是html，章节列表内容如下
```html
<div class="bd">
    <ul class="list" id="listsss">
        <div data-id="0">
            <li id="chapter">
                <a href="http://m.biquge.net/book/107056/49982046.html">序 穿越四顾心茫然</a>
            </li>
            <li id="chapter">
                <a href="http://m.biquge.net/book/107056/49982047.html">第一话 骄傲无知的现代人</a>
            </li>
            <li id="chapterimg.alicdn.com">
                <a href="http://m.biquge.net/book/107056/49982048.html">第二话 十里坡剑神</a>
            </li>
          
        </div>
        <div data-id="1"></div>
    </ul>
</div>
```
## 章节详情结构分析
下面的每一章节的最后一页的html地址的内容，
+ 需要递归获取每一页的内容
+ 正常情况下页面内容里面是有“下一页”，但是“下一页”的按钮是个图片，难以作为判断依据
+ 非最后一页的情况下无下一章的按钮，所以可以根据页面内容里面是否有“下一章”的文案来作为递归的条件
```html
    <div class="pager">
        <a href="49982048_3.html">上一页</a>
        <a href="http://m.biquge.net/book/107056/">简介</a>
        <a href="49982049.html">下一章</a>
    </div>
 <div class="content" id="txt">
        <dd data-id="6">
            <p>“叫我的名字？”尹泽愣住，受宠若惊，连忙拒绝，“我知道你和川村小哥很重视我，但这未免太过浮夸，我背不住呀？”</p>
            <p>“……电影的名称是‘你的名字’。明白吗？”新渡诚无语，比划着手势。</p>
            <p>“哦，原来这是标题啊，小弟我愿意陪你上映。”尹泽打着哈哈掩饰尴尬。</p>
            <p>“话说怎么电脑一直开着PS的全屏模式啊？”新渡诚歪着身子，绕过去看，有些皱眉。</p>
            <p>“这不显得更宽敞吗。”尹泽移动两步，挡住导演探究的视线。</p>
            <p>新渡诚思索两秒，视线左右移动，旋即恍然，露出富含深意的迷之微笑，“哎，老师不必紧张，这里又没有外人，都是搞正经艺术的，不用觉得害羞。”</p>
            <p>“这是何意啊？”尹泽不解。</p>
            <p>“还装还装。都是画画的，研究人体还遮遮掩掩，生怕被发现了似的，真不爽利。咋还偷看呢。”新渡诚潇洒一笑，强行伸过去摸住鼠标，“让我瞧瞧，是伯里曼还是金政基呀，又或者是寺田克也——啊啊！这些是什么？！”</p>
            <p>「如章节缺失请退#出#阅#读#模#式」</p>
        </dd>
    </div>
```
根据上述内容，写一个node脚本，获取每一章节的每一页内容最并整合，最终输出一个txt文件，注意要携带章节名称

# 编码实战
```js
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs").promises;
const winston = require("winston");

const MAX_DEPTH = 10; // 设定最大递归深度
const CHAPTER_LIST_URL = "http://m.biquge.net/book/107056/chapterlist"; // 列表目录
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
    const chapterLinks = $("#listsss li a")
      .map((_, elem) => ({
        chapterName: $(elem).text(),
        url: $(elem).attr("href")
      }))
      .get();
    return chapterLinks;
  } catch (error) {
    logger.error("Error fetching chapter list:", error);
    return [];
  }
}

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

async function saveToFile(chapters) {
  const totalChapters = chapters.length;
  const allContentPromises = chapters.map(item => fetchChapterContentAndNext(item.url, item.chapterName));

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
    chapterLinks = chapterLinks.slice(-10);
  }
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

```

# 代码结构和流程
> 代码分析来自“通义千问”（q:为我提供代码结构和流程分析）

该代码是一个Node.js应用程序，主要目的是爬取一个网络小说网站上的章节列表和章节内容，然后将所有章节内容合并并保存到本地文件中。下面是对代码结构和流程的详细分析：

### 代码结构

1. **依赖导入**: 导入了`axios`用于发起HTTP请求，`cheerio`用于解析HTML文档，`fs.promises`用于文件的异步读写操作，以及`winston`作为日志记录工具。

2. **全局配置**:
   - **axios实例配置**: 设置了默认的请求头，模拟浏览器访问以避免被服务器拒绝。
   - **日志配置**: 定义了日志记录的格式、级别以及输出目的地（文件和控制台）。
   - **常量定义**: 包括最大递归深度、章节列表URL、请求间隔时间、并发请求限制等。

3. **辅助函数**:
   - **delay**: 异步函数，用于在请求间增加延迟，以减轻服务器压力。
   - **fetchChapterList**: 根据给定的URL获取章节列表，使用`cheerio`解析页面内容，提取章节标题和链接。
   - **fetchChapterContentAndNext**: 递归函数，用于获取章节内容，若章节有“下一章”，则递归抓取，直到达到最大递归深度或无下一章。
   - **saveToFile**: 异步函数，将所有章节内容整合并分批次保存到本地文件，同时控制并发量并显示进度。

4. **主函数** (`main`):
   - 获取命令行参数，判断是否进行测试模式（只抓取部分章节）。
   - 调用`fetchChapterList`获取章节列表。
   - 使用`saveToFile`异步处理章节列表，抓取内容并写入文件。
   - 计算并记录总耗时。
   - 全局错误处理，捕获并记录执行过程中可能出现的错误。

### 流程分析

1. **初始化**: 设置好所有必要的配置和工具。
2. **章节列表获取**: 首先调用`fetchChapterList`函数获取小说的章节列表。
3. **内容抓取与整合**:
   - 对每个章节，使用`fetchChapterContentAndNext`递归抓取章节内容，直至达到最大深度或无下一章。
   - 使用`saveToFile`函数，分批次并发处理章节内容的抓取，控制并发数以避免对服务器造成过大压力，同时实时更新本地文件内容。
4. **进度与日志**: 在处理过程中，通过控制台输出进度条，并通过`winston`记录日志，包括错误信息、警告和操作完成信息。
5. **结束与统计**: 爬取完成后，计算并打印总耗时，以及处理的章节总数、最大递归深度、延迟时间、并发请求数等统计信息。

整体而言，代码结构清晰，遵循了良好的编程实践，通过模块化设计使得各个功能部分职责明确，易于理解和维护。通过精心设计的并发控制和错误处理机制，提高了爬虫的稳定性和效率。

# 深度思考

最初版本的内容里面请求是串行的，后来因为速度太慢，然后使用五个请求并行的方法，预计提升5倍的效率，但是实际上提升了七十倍，没搞懂为什么有这么大的提升,下面是串行的代码

```js
async function saveToFile(chapters) {
  let allContent = "";
  const totalChapters = chapters.length;
  for (let index = 0; index < totalChapters; index++) {
    const item = chapters[index];
    const fullChapterContent = await fetchChapterContentAndNext(
      item.url,
      item.chapterName
    );
    allContent += fullChapterContent;

    // 计算并打印进度
    const progress = ((index + 1) / totalChapters) * 100;
    process.stdout.write(
      `\r处理进度: ${progress.toFixed(2)}%  当前处理--${item.chapterName}`
    );
  }
  process.stdout.write("\n"); // 在完成所有章节处理后换行
  const cleanedStr = allContent.replace(
    /！「如章节缺失请退#出#阅#读#模#式」/g,
    ""
  );
  await fs.writeFile("chapters.txt", cleanedStr, "utf8");
}
```

并行方案耗时
```shell
处理进度: 100.79%
操作完成，总共耗时: 18.55 秒
```
串行方案耗时
```shell
处理进度: 100.00%  当前处理--第九十一话 剑指下一届
操作完成，总共耗时: 1270.63 秒
```

# changelog

## 1.2.0 (2024-06-21)


### ✏️ Documentation | 文档

* **root:** 订正changelog ([c9ef9b2](https://github.com/tds/node-demo/commit/c9ef9b2e7af86e85805b080dce6b48d03ec78801))


### ⚡ Performance Improvements | 性能优化

* **download-text:** 内存管理优化;按批次分割内容写入文件 ([f75db43](https://github.com/tds/node-demo/commit/f75db4396b097839fa3097ebd2bee18ea80841db))


### 👷 Continuous Integration | CI 配置

* **root:** 添加格式化设置 ([44af209](https://github.com/tds/node-demo/commit/44af209b0bb4dfcfe6b151a62f5be0f8c5b9135d))


### ✨ Features | 新功能

* **download-text:** 设置全局的默认请求头,避免被服务器识别为爬虫并拒绝服务 ([94bfd20](https://github.com/tds/node-demo/commit/94bfd203ff9d12d0ededa87860545ec7ccfa83b3))
* **download-text:** 增加日志记录 ([e4c0d77](https://github.com/tds/node-demo/commit/e4c0d771658bd4d938259ad4134a9182ea779aba))

## 1.1.0 (2024-06-18)


### ✏️ Documentation | 文档

* **download-text:** 文章备份 ([bcdb010](https://github.com/tds/node-demo/commit/bcdb010b78cea5e6e1a394929c0373bc8e65a0fa))
* **root:** 更新 readme 文件 ([edf6f74](https://github.com/tds/node-demo/commit/edf6f744ddb856706e6d3f8eb463b92084acbdef))


### ✨ Features | 新功能

* **download-text:** 方法初始化 ([09b9afa](https://github.com/tds/node-demo/commit/09b9afa4968aa83524756be45c3e0042666ed2ff))
* **download-text:** 添加并发 ([ac4a447](https://github.com/tds/node-demo/commit/ac4a447a6c234db22fb92fa0b79d22e2f0dc7ae2))
* **download-text:** 解析用户在命令行中输入的参数;增加测试的命令 ([0c785e5](https://github.com/tds/node-demo/commit/0c785e532723711f7ffd9782f5f9db8ab03631d4))
* **root:** 更新eslint以及git配置 ([ebc254a](https://github.com/tds/node-demo/commit/ebc254ae56fbf97d13faef8dfa932695a90b8927))
* **root:** 项目添加生成修改日志的功能 ([ee2ab3f](https://github.com/tds/node-demo/commit/ee2ab3fbd383a14b9837663eccbed8bfd7786d03))

