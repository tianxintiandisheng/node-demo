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

```

# 代码分析
> 代码分析来自“通义千问”

这段JavaScript代码使用了`axios`、`cheerio`和Node.js的文件系统模块`fs`来实现了一个小说爬虫程序，其主要功能是从一个在线小说网站抓取章节列表及其内容，并将这些内容保存到本地文件中。下面是详细的流程分析与注释解释：

## 代码结构
### 初始化与配置
- 引入必要的模块：`axios`用于发送HTTP请求，`cheerio`用于解析HTML文档，以及Node.js的异步文件系统模块`fs.promises`用于文件操作。
- 定义几个关键常量：`MAX_DEPTH`限制递归深度以防止无限循环，`CHAPTER_LIST_URL`为目标小说的章节列表页面地址，`DELAY_MS`是请求之间的延迟时间（单位：毫秒），`LIMIT_CONCURRENT_REQUESTS`限制并发请求的数量以减轻服务器压力。

### 辅助函数
- `delay()`函数：用于在请求之间引入延迟，以遵守网站的访问规则和避免被封禁。
  
### 数据获取
- `fetchChapterList(url)`：此函数负责获取章节列表页面的HTML内容，然后使用`cheerio`解析出每一章的标题和链接，最后以对象数组形式返回章节信息。
  
### 内容抓取与递归
- `fetchChapterContentAndNext(chapterUrl, currentChapterName, depth)`：这是核心函数，负责递归地获取单个章节的全部内容。它首先尝试获取章节的HTML内容，接着检查是否有“下一章”的链接。如果有，则根据URL结构递归调用自身以获取下一章的内容；如果没有，则返回当前章节的内容。递归深度由`MAX_DEPTH`限制，超出则停止抓取并给出警告。

### 文件保存
- `saveToFile(chapters)`：此函数遍历章节列表，为每个章节发起内容抓取请求。为了管理并发，使用`LIMIT_CONCURRENT_REQUESTS`限制每次处理的请求数量，并使用`Promise.all`来批量处理这些请求。章节内容经处理后（去除不需要的部分），最终写入到名为`chapters.txt`的文件中。

### 主函数与执行
- `main()`：程序的入口点，它首先记录开始时间，然后调用`fetchChapterList`获取章节列表，再调用`saveToFile`处理并保存章节内容，最后计算并打印整个操作的总耗时。

### 异常处理
- 整个程序通过`.catch(console.error)`确保任何未捕获的异常都能被打印出来，以便于调试和监控。

## 流程总结
1. **准备阶段**：设置配置项，导入依赖。
2. **获取章节列表**：通过`fetchChapterList`获取小说的所有章节链接。
3. **内容抓取**：利用`fetchChapterContentAndNext`递归地抓取每个章节的详细内容，同时控制递归深度和并发请求量以优化性能和尊重网站规则。
4. **内容保存**：在`saveToFile`中整理抓取到的所有章节内容，清理不必要的信息，并将其保存到本地文件。
5. **完成与统计**：记录程序运行的总耗时，并通知用户操作已完成。

整个过程体现了对目标网站数据的自动化采集、处理与存储，展现了网络爬虫的基本工作原理。

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
