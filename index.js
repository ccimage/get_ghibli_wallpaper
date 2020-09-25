/*
    npm i 安装依赖

    node index.js运行

    可以修改g开头的全局变量。  mac/linux/windows 根据系统习惯修改gFilePath参数

*/

var request = require('request');
var promise = require('bluebird');
var fs = require('fs');
const cheerio = require('cheerio')
const baseUrl = ["http://www.ghibli.jp/works/marnie/", "http://www.ghibli.jp/works/kaguyahime/", "http://www.ghibli.jp/works/kazetachinu/", "http://www.ghibli.jp/works/kokurikozaka/", "http://www.ghibli.jp/works/karigurashi/", "http://www.ghibli.jp/works/ponyo/", "http://www.ghibli.jp/works/ged/", "http://www.ghibli.jp/works/chihiro/"];
const gTaskCount = 5; // 同时进行的下载任务
const gFilePath = "D:\\Downloads\\download\\";

let gTotalSuccess = 0;
let gTotalFailed = 0;

function startReq(url, folder) {
    return new Promise(function (resolve, reject) {
        let downloadItems = [];
        request(url, {timeout: 60000}, function (error, response, body) {
			if(error) {
				reject(error);
				return;
            }
            if (response.statusCode !== 200) {
                reject("web 返回错误 " + response.statusCode + response.statusMessage);
				return;
            }
            const $ = cheerio.load(body);
            const data = $('figure > a ');
            
            data.map((k) => {
                if (data[k] && data[k].attribs.class === "panelarea") {
                    const title = data[k].attribs.title;
                    const size = data[k].attribs["data-size"];
                    const link = data[k].attribs.href;	
                    
                    downloadItems.push({
                        title,
                        size,
                        link,
                        folder
                    });
                }
				
            })
            console.log("分析完成", url);
            resolve({downloadItems});
        });
 
    });
}

async function batchDownloadFile(downloadLists) {
    const batchTask = [];
    for (let i = 0; i < gTaskCount; i++) {
        if(downloadLists.length <= 0) {
            break;
        }
        const item = downloadLists.splice(0, 1)[0];
        batchTask.push(downloadFile(item.link, item.filename, item.folder));
    }
    await promise.all(batchTask).then((allRet => {
        for(let i = 0; i < allRet.length; i++) {
            if (allRet[i]) {
                gTotalSuccess++;
            } else {
                gTotalFailed++;
            }
        }
    }));
    if (downloadLists.length <=0) {
        console.log("一组任务完成 当前", gTotalSuccess, "成功", gTotalFailed, "失败");
        return;
    }
    batchDownloadFile(downloadLists);
}
function downloadFile(url, filename, folder) {
    return new Promise(async function (resolve, reject) {
        const fileFullPath = `${gFilePath}/${folder}/${filename}.jpg`;
        if(fs.existsSync(fileFullPath)) {
            resolve(true);
            return;
        }
        try {
            const folderlocal = `${gFilePath}/${folder}`;
            if (!fs.existsSync(folderlocal)) {
                fs.mkdirSync(folderlocal);
            }
            
            const downUrl = url;
            //console.log("开始下载", fileFullPath);
            var writeStream = fs.createWriteStream(fileFullPath);
            var readStream = request(downUrl);
            readStream.pipe(writeStream);
            readStream.on('end', function(response) {
                //console.log(fileFullPath, "下载完成");
                writeStream.end();
            });

            writeStream.on("finish", function() {
                //console.log("ok");
                //console.log(fileFullPath, "保存完成");
                resolve(true);
            });
        } catch (e) {
            console.log("出错了", e.message);
            resolve(false);
        }
    });
}
const reqArray = [];
for (let i = 0; i < baseUrl.length; i++) {
    const folder = baseUrl[i].replace("http://www.ghibli.jp/works/", "");
    reqArray.push(startReq(baseUrl[i], folder.replace("/", "")));
}


    promise
        .all(reqArray)
        .then(function(items) {
            const downloadItems = [];
            items.forEach(ele => {
                for(let i = 0; i < ele.downloadItems.length; i++) {
                    const de = ele.downloadItems[i];
                    const link = de.link;
                    const filename = de.title+"_"+de.size;
                    downloadItems.push({filename, link, folder: de.folder});
                }
            });
            batchDownloadFile(downloadItems);
        }).catch(err => {
			console.log(err);
		});