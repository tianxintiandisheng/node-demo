const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs").promises;

const MAX_DEPTH = 10; // 设定最大递归深度
const CHAPTER_LIST_URL = "http://m.ggdwx.net/book/107056/chapterlist"; // 列表目录
const DELAY_MS = 1; // 延迟时间
const LIMIT_CONCURRENT_REQUESTS = 5; // 设置并发请求的最大数量

// 创建一个带有默认配置的axios实例
const axiosInstance = axios.create({
  // 在这里设置全局的默认请求头,避免被服务器识别为爬虫并拒绝服务
  headers: {
    "User-Agent": "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
    Referer: "https://tds-referer-url.com"
  }
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
    console.error("Error fetching chapter list:", error);
    return [];
  }
}

async function fetchChapterContentAndNext(chapterUrl, currentChapterName = "未知章节", depth = 0) {
  if (depth >= MAX_DEPTH) {
    console.warn(`\n warn 达到最大递归深度 ${MAX_DEPTH}, 停止抓取后续章节.`);
    console.warn(`\n 错误章节名称:${currentChapterName}`);
    console.warn(`\n 错误章节地址:${chapterUrl}`);
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
    console.error("Error fetching chapter content:", error);
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
      batchPromises.map(p => p.catch(err => console.error(`Error in batch: ${err}`)))
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
    chapterLinks = chapterLinks.slice(0, 10);
  }
  await saveToFile(chapterLinks);
  const endTime = Date.now(); // 结束时间记录
  const totalTimeInSeconds = (endTime - startTime) / 1000; // 总耗时（秒）

  console.log(`操作完成，总共耗时: ${totalTimeInSeconds.toFixed(2)} 秒`);
}

main().catch(console.error);
