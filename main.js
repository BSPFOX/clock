// 获取DOM元素
const timeDom = document.getElementById('time');
const dateDom = document.getElementById('date');

// 星期映射表
const weekArr = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];

// 更新时钟函数
function updateClock() {
    const now = new Date();
    // 获取时分秒，不足两位补0
    let h = String(now.getHours()).padStart(2, '0');
    let m = String(now.getMinutes()).padStart(2, '0');
    let s = String(now.getSeconds()).padStart(2, '0');
    // 拼接时间
    timeDom.innerText = `${h}:${m}:${s}`;

    // 获取年月日星期
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const week = weekArr[now.getDay()];
    dateDom.innerText = `${year}年${month}月${day} ${week}`;
}

// 立即执行一次，避免页面空白等待1秒
updateClock();
// 每秒刷新一次
setInterval(updateClock, 1000);