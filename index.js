const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs").promises;

const MAX_DEPTH = 10; // 设定最大递归深度
const CHAPTER_LIST_URL = "http://m.biquge.net/book/107056/chapterlist"; // 列表目录
const DELAY_MS = 1; // 延迟时间
const LIMIT_CONCURRENT_REQUESTS = 5; // 设置并发请求的最大数量

// 模拟延迟
function delay() {
  return new Promise((resolve) => setTimeout(resolve, DELAY_MS));
}

async function fetchChapterList(url) {
  try {
    const response = await axios.get(url);
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

async function fetchChapterContentAndNext(
  chapterUrl,
  currentChapterName = "未知章节",
  depth = 0
) {
  if (depth >= MAX_DEPTH) {
    console.warn(`\n warn 达到最大递归深度 ${MAX_DEPTH}, 停止抓取后续章节.`);
    console.warn(`\n 错误章节名称:${currentChapterName}`);
    console.warn(`\n 错误章节地址:${chapterUrl}`);
    return "";
  }
  try {
    const response = await axios.get(chapterUrl);
    const $ = cheerio.load(response.data);

    // 获取当前章节当前页内容
    const content = $(".content dd").text();

    // 页面内是否存在下一章的按钮
    const withNextButton = !!$('.pager a:contains("下一章")')
      .first()
      .attr("href");
    const withEndButton = !!$('.pager a:contains("看完了")')
      .first()
      .attr("href");
    if (withNextButton || withEndButton) {
      // 下一章的按钮存在，说明当前章节已结束
      return `${currentChapterName}\n\n${content}`;
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
      const nextContent = await fetchChapterContentAndNext(
        nextPageLink,
        currentChapterName,
        depth + 1
      );
      return `${content}\n\n---\n\n${nextContent}`;
    }
  } catch (error) {
    console.error("Error fetching chapter content:", error);
    return "";
  }
}

async function saveToFile(chapters) {
  const totalChapters = chapters.length;
  const allContentPromises = [];

  // 预先创建所有章节内容的Promise数组
  for (let index = 0; index < totalChapters; index++) {
    const item = chapters[index];
    allContentPromises.push(
      fetchChapterContentAndNext(item.url, item.chapterName)
    );
  }

  // 使用Promise.all分批次处理Promise数组，控制并发数量
  let allContent = "";
  for (
    let i = 0;
    i < allContentPromises.length;
    i += LIMIT_CONCURRENT_REQUESTS
  ) {
    // 取出一批Promise进行并发处理
    const batchPromises = allContentPromises.slice(
      i,
      i + LIMIT_CONCURRENT_REQUESTS
    );
    await delay();
    const batchResults = await Promise.all(
      batchPromises.map((p) =>
        p.catch((err) => console.error(`Error in batch: ${err}`))
      )
    );

    // 将这批结果合并到allContent中
    batchResults.forEach((content) => {
      allContent += content || ""; // 确保错误处理后的内容仍能合并
    });

    // 计算并打印进度
    const progress = ((i + LIMIT_CONCURRENT_REQUESTS) / totalChapters) * 100;
    process.stdout.write(`\r处理进度: ${progress.toFixed(2)}%`);
  }
  process.stdout.write("\n"); // 完成所有章节处理后换行

  // 清理并保存内容
  const cleanedStr = allContent.replace(
    /！「如章节缺失请退#出#阅#读#模#式」/g,
    ""
  );
  await fs.writeFile("chapters.txt", cleanedStr, "utf8");
}

async function main() {
  const startTime = Date.now(); // 开始时间记录

  const chapterLinks = await fetchChapterList(CHAPTER_LIST_URL);
  // const chapterLinksTest = chapterLinks.slice(-2); // 小范围测试
  // console.log("🚀 ~ main ~ chapterLinks_test:", chapterLinksTest);
  await saveToFile(chapterLinks);
  const endTime = Date.now(); // 结束时间记录
  const totalTimeInSeconds = (endTime - startTime) / 1000; // 总耗时（秒）

  console.log(`操作完成，总共耗时: ${totalTimeInSeconds.toFixed(2)} 秒`);
}

main().catch(console.error);

