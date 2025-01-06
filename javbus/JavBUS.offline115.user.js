// ==UserScript==
// @name            JavBUS.offline115
// @version         0.0.1
// @author          zyashakii
// @description     115 网盘离线
// @match           https://www.javbus.com/*
// @match           https://captchaapi.115.com/*
// @icon            https://www.google.com/s2/favicons?sz=64&domain=javbus.com
// @require         https://github.com/bolin-dev/JavPack/raw/main/libs/JavPack.Grant.lib.js
// @require         https://github.com/bolin-dev/JavPack/raw/main/libs/JavPack.Magnet.lib.js
// @require         https://github.com/bolin-dev/JavPack/raw/main/libs/JavPack.Offline.lib.js
// @require         https://github.com/bolin-dev/JavPack/raw/main/libs/JavPack.Req.lib.js
// @require         https://github.com/bolin-dev/JavPack/raw/main/libs/JavPack.Req115.lib.js
// @require         https://github.com/bolin-dev/JavPack/raw/main/libs/JavPack.Util.lib.js
// @resource        pend https://github.com/bolin-dev/JavPack/raw/main/assets/icon.png
// @resource        warn https://github.com/bolin-dev/JavPack/raw/main/assets/warn.png
// @resource        error https://github.com/bolin-dev/JavPack/raw/main/assets/error.png
// @resource        success https://github.com/bolin-dev/JavPack/raw/main/assets/success.png
// @connect         jdbstatic.com
// @connect         aliyuncs.com
// @connect         javbus.com
// @connect         javdb.com
// @connect         115.com
// @run-at          document-start
// @grant           GM_removeValueChangeListener
// @grant           GM_addValueChangeListener
// @grant           GM_getResourceURL
// @grant           GM_xmlhttpRequest
// @grant           GM_notification
// @grant           unsafeWindow
// @grant           GM_openInTab
// @grant           window.close
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_addStyle
// @grant           GM_info
// @require         https://github.com/Tampermonkey/utils/raw/d8a4543a5f828dfa8eefb0a3360859b6fe9c3c34/requires/gh_2215_make_GM_xhr_more_parallel_again.js
// ==/UserScript==

const config = [
  {
    name: "无码",
    dir: "0000小姐姐仓库/0X88无码蓝光/CDRPBD",
    color: "is-normal",
    rename: "${code}",
    inMagnets: true,
  },
  {
    name: "普通",
    dir: "0000小姐姐仓库/0X04普通片库",
    color: "is-normal",
    magnetOptions: {
      filter: ({ size, number }) => {
        const magnetSize = parseFloat(size);
        return magnetSize > 3 * 1024 ** 3 && number <= 6;
      },
      sort: (a, b) => {
        const regex = /\.torrent$/;
        const aName = regex.test(a.name);
        const bName = regex.test(b.name);
        if (aName !== bName) return aName ? -1 : 1; // 优先.torrent
        // if (a.zh !== b.zh) return a.zh ? -1 : 1; // 优先中字
        // if (a.crack !== b.crack) return a.crack ? -1 : 1; // 优先破解
        return parseFloat(b.size) - parseFloat(a.size); // 优先大文件
      },
    },
  },
  {
    name: "破解",
    dir: "0000小姐姐仓库/0X01破解片库",
    color: "is-crack",
    magnetOptions: {
      filter: ({ size, crack, number }) => {
        const magnetSize = parseFloat(size);
        return magnetSize > 3 * 1024 ** 3 && crack && number <= 6;
      },
    },
  },
  {
    name: "字幕",
    dir: "0000小姐姐仓库/0X02字幕片库",
    color: "is-zh",
    magnetOptions: {
      filter: ({ size, zh, number }) => {
        const magnetSize = parseFloat(size);
        return magnetSize > 3 * 1024 ** 3 && zh && number <= 6;
      },
    },
  },
  {
    name: "4K",
    dir: "0000小姐姐仓库/0X03高清片库",
    color: "is-fourk",
    magnetOptions: {
      filter: ({ fourk, number }) => {
        return fourk && number <= 10;
      },
      sort: (a, b) => {
        //if (a.zh !== b.zh) return a.zh ? -1 : 1; // 优先中字
        if (a.crack !== b.crack) return a.crack ? -1 : 1; // 优先破解
        if (a.fourk !== b.fourk) return a.fourk ? -1 : 1;
        return parseFloat(b.size) - parseFloat(a.size); // 优先大文件
      },
    },
  },
  {
    name: "中文破解",
    dir: "0000小姐姐仓库/0X00破解字幕",
    color: "is-uc",
    magnetOptions: {
      filter: ({ size, uc }) => {
        const magnetSize = parseFloat(size);
        return magnetSize > 3 * 1024 ** 3 && uc;
      },
    },
  },
  {
    name: "共演",
    dir: "0000小姐姐仓库/0X05梦幻共演",
    color: "is-gongyan",
    magnetOptions: {
      filter: ({ size, number }) => {
        const magnetSize = parseFloat(size);
        return magnetSize > 3 * 1024 ** 3 && number <= 6;
      },
    },
  },

];

const TARGET_CLASS = "zy-offline";
const { host: HOST, pathname: PATHNAME } = location;
const IS_DETAIL = PATHNAME.includes("-");
const LOAD_CLASS = "is-loading";

const VERIFY_HOST = "captchaapi.115.com";
const VERIFY_URL = `https://${VERIFY_HOST}/?ac=security_code&type=web&cb=Close911`;
const VERIFY_KEY = "VERIFY_STATUS";
const VERIFY_PENDING = "PENDING";
const VERIFY_VERIFIED = "VERIFIED";
const VERIFY_FAILED = "FAILED";

const transToByte = Magnet.useTransByte();

const getDetails = (dom = document) => {
  const infoNode = dom.querySelector(".col-md-3.info");
  if (!infoNode) return;

  const code = dom.querySelector(".info p :last-child").textContent.trim();
  const prefix = code.split("-")[0].trim();

  const title = dom.querySelector(".container h3").textContent.replace(code, "").trim().slice(0, 40);

  let cover = dom.querySelector("a.bigImage")?.href;
  const actors = dom.querySelector(".col-md-3.info p:last-child a")?.textContent.trim();

  const info = {};
  infoNode.querySelectorAll("p").forEach((item) => {
    const label = item.querySelector("span.header")?.textContent;
    const value = item.textContent.trim();
    if (!label || !value || value.includes("N/A")) return;

    switch (label) {
      case "發行日期:":
        info.date = value.replace("發行日期：", "").trim();
        break;
      case "製作商:":
        info.maker = value.replace("製作商：", "").trim();
        break;
      case "發行商:":
        info.publisher = value.replace("發行商：", "").trim();
        break;
      case "系列:":
        info.series = value.replace("系列：", "").trim();
        break;
    }
  });

  if (prefix) info.prefix = prefix;
  if (cover) info.cover = cover;
  if (actors) info.actors = actors;

  const { codes, regex } = Util.codeParse(code);
  return { codes, regex, code, title, ...info };
};

console.log(getDetails());

const renderAction = ({ color, index, idx, desc, name }) => {
  return `
  <button
    class="${TARGET_CLASS} button ${color}"
    data-index="${index}"
    data-idx="${idx}"
    title="${desc}"
  >
    ${name}
  </button>
  `;
};

const findAction = ({ index, idx }, actions) => {
  return actions.find((act) => act.index === Number(index) && act.idx === Number(idx));
};

const parseMagnet = (node) => {
  const name = node.querySelector("td a")?.textContent.trim() ?? "";
  const meta = node.querySelector("td:nth-child(2) a")?.textContent.trim() ?? "";
  const size = transToByte(meta.split(",")[0]);
  return {
    url: node.querySelector("td a").href.split("&")[0].toLowerCase(),
    zh: !!node.querySelector("a.btn-warning") || Magnet.zhReg.test(name),
    size: size,
    crack: Magnet.crackReg.test(name),
    fourk: Magnet.fourkReg.test(name) || size >= 8.6 * 1024 ** 3,
    uc: Magnet.ucReg.test(name),
    meta,
    name,
  };
};
const getMagnets = (dom = document) => {
  return [...dom.querySelectorAll("#magnet-table > tr")].map(parseMagnet).toSorted(Magnet.magnetSort);
};

const closeVerify = () => {
  if (GM_getValue(VERIFY_KEY) !== VERIFY_VERIFIED) GM_setValue(VERIFY_KEY, VERIFY_FAILED);
};

const openVerify = () => {
  GM_setValue(VERIFY_KEY, VERIFY_PENDING);
  const verifyTab = Grant.openTab(`${VERIFY_URL}_${new Date().getTime()}`);
  verifyTab.onclose = closeVerify;
};

const offline = async ({ options, magnets, onstart, onprogress, onfinally }, currIdx = 0) => {
  onstart?.();
  const res = await Req115.handleOffline(options, magnets.slice(currIdx));

  if (res.status !== "warn") return onfinally?.(res);
  onprogress?.(res);

  const listener = GM_addValueChangeListener(VERIFY_KEY, (_name, _old_value, new_value) => {
    if (![VERIFY_FAILED, VERIFY_VERIFIED].includes(new_value)) return;
    GM_removeValueChangeListener(listener);
    if (new_value === VERIFY_FAILED) return onfinally?.();
    offline({ options, magnets, onstart, onprogress, onfinally }, res.currIdx);
  });

  if (GM_getValue(VERIFY_KEY) === VERIFY_PENDING) return;
  Grant.notify(res);
  openVerify();
};

(function () {
  if (location.host === VERIFY_HOST) Offline.verifyAccount(VERIFY_KEY, VERIFY_VERIFIED);
})();

//详情页
(function () {
  if (!IS_DETAIL) return;
  setTimeout(() => {
    const details = getDetails();
    if (!details) return;

    const actions = Offline.getActions(config, details);
    if (!actions.length) return;

    const insertActions = (actions) => {
      document.querySelector(".col-md-3.info").insertAdjacentHTML(
        "beforeend",
        `<div class="zy-offline">
              ${actions.map(renderAction).join("")}
        </div>`,
      );

      const inMagnets = actions.filter(({ inMagnets }) => Boolean(inMagnets));
      if (!inMagnets.length) return;

      const inMagnetsTxt = inMagnets.map(renderAction).join("");
      const magnetsNode = document.querySelector("#magnet-table");

      const insert = (node) => node.querySelector("td:last-child").insertAdjacentHTML("beforeend", inMagnetsTxt);
      const insertMagnets = () => magnetsNode.querySelectorAll("tr:not(:first-child)").forEach(insert);
      insertMagnets();

      const callback = (mutations) => mutations.forEach(({ type }) => type === "childList" && insertMagnets());
      const observer = new MutationObserver(callback);
      observer.observe(magnetsNode, { childList: true, attributes: false, characterData: false });
    };

    const findMagnets = (target, options) => {
      if (!target.closest("#magnet-table")) return Offline.getMagnets(getMagnets(), options);
      return [parseMagnet(target.closest("tr"))];
    };

    const onstart = (target) => {
      Util.setFavicon("pend");
      target.classList.add(LOAD_CLASS);
      document.querySelectorAll(`.${TARGET_CLASS}`).forEach((item) => item.setAttribute("disabled", ""));
    };

    const onfinally = (target, res) => {
      document.querySelectorAll(`.${TARGET_CLASS}`).forEach((item) => item.removeAttribute("disabled"));
      target.classList.remove(LOAD_CLASS);
      if (!res) return;

      Grant.notify(res);
      Util.setFavicon(res);
      Req115.sleep(0.5).then(() => unsafeWindow["reMatch"]?.());
    };

    const onclick = (e) => {
      const target = e.target.closest(`.${TARGET_CLASS}`);
      if (!target) return;

      e.preventDefault();
      e.stopPropagation();

      const action = findAction(target.dataset, actions);
      if (!action) return;

      const { magnetOptions, ...options } = Offline.getOptions(action, details);
      const magnets = findMagnets(target, magnetOptions);
      if (!magnets.length) return;

      offline({
        options,
        magnets,
        onstart: () => onstart(target),
        onprogress: Util.setFavicon,
        onfinally: (res) => onfinally(target, res),
      });
    };

    insertActions(actions);
    document.addEventListener("click", onclick);

  }, 3000);
})();

// 修改JAVBUS页面的样式并替换图片
(function () {
  GM_addStyle(`
    button.zy-offline {
      font-size: 12px !important; /* 设置按钮的字体大小 */
      padding: 5px 12px !important; /* 为按钮增加内边距 */
      color: white; /* 按钮文字颜色 */
      border: none !important; /* 移除默认边框 */
      cursor: pointer !important; /* 鼠标悬浮时显示手型光标 */
      position: relative !important; /* 相对定位 */
      overflow: hidden; /* 隐藏超出部分 */
    }

    button.zy-offline:hover {
      background-color:rgb(102, 252, 142) !important; /* 按钮悬浮时的背景色 */
      color: #000000 !important; /* 按钮悬浮时的文字颜色 */
    }
/* 加载状态 */
.button.is-loading {
  pointer-events: none; /* 禁用点击 */
  color: transparent; /* 隐藏文字 */
}

/* 中央进度条 */
.button.is-loading::after {
  content: "";
  position: absolute;
  top: 50%; /* 垂直居中 */
  left: 0;
  width: 100%;
  height: 2px; /* 进度条高度 */
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
  transform: translateY(-50%); /* 垂直居中 */
  animation: loading 1.5s infinite; /* 循环播放 */
}

/* 动画关键帧 */
@keyframes loading {
  0% {
    transform: translate(-100%, -50%); /* 初始位置 */
  }
  100% {
    transform: translate(100%, -50%); /* 结束位置 */
  }
}
    button.is-uc {
    background-color: #D71103;
    }
    button.is-zh {
    background-color: #FE5E08;
    }
    button.is-crack {
    background-color: #156AA8;
    }
    button.is-normal {
    background-color: #555555;
    }
    button.is-wuma {
    background-color: #00AC6A;
    }
    button.is-fourk {
    background-color: #1e9022;
    }
    button.is-gongyan {
    background-color: #d30086;
    }
    .movie-box {
      width: 485px !important;
      margin: 10px !important;
      height: 424px !important;
      background-color: #fafafa !important;
      transition: all 0.3s cubic-bezier(0, 0, 0.5, 1);

    }
    .movie-box:focus, .movie-box:hover {
      box-shadow: 0 .5em 1em -.125em rgba(10,10,10,.1), 0 0 0 1px #485fc7;
    }
    .movie-box img,
    .movie-box .photo-frame {
    height: 312px !important;
    vertical-align: top !important;
    object-position: top !important;
    margin: 0 !important;
    }
    .movie-box .photo-info {
    padding: 5px !important;
    }
    .photo-info {
    white-space: nowrap; /* 强制文本不换行 */
    overflow: hidden; /* 隐藏溢出内容 */
    text-overflow: ellipsis; /* 显示省略号 */
    }
    #waterfall {
    width: 1920px !important; 
    left: auto !important; /* 左边距 */
    }
  `)

  window.addEventListener('DOMContentLoaded', () => {
    // 获取所有符合条件的图片元素
    const imgs = document.querySelectorAll(".photo-frame img");

    // 遍历每个图片
    imgs.forEach(img => {
      // 获取当前图片的 src 属性
      const originalSrc = img.src;

      // 判断路径是否符合规则
      if (originalSrc.match(/\/(imgs|pics)\/(thumb|thumbs)\//)) {
        const newSrc = originalSrc.replace(/\/(imgs|pics)\/(thumb|thumbs)\//, '/$1/cover/').replace(/(\.jpg|\.jpeg|\.png)$/i, '_b$1');
        img.src = newSrc;
      }
    });
  });
})();
(function () {
  if (IS_DETAIL) return;
  setTimeout(() => {
    const SELECTOR = ".item.masonry-brick";
    const movieList = document.querySelectorAll(SELECTOR);
    if (!movieList.length) return;

    const getParams = () => {
      const { pathname: PATHNAME } = location;
      if (PATHNAME.startsWith("/tags")) {
        const categoryNodeList = document.querySelectorAll("#tags .tag-category");
        const genreNodeList = [...categoryNodeList].filter((item) => Number(item.dataset.cid) !== 10);
        const genres = [...genreNodeList].flatMap((item) => {
          return [...item.querySelectorAll(".tag_labels .tag.is-info")].map((it) => it.textContent.trim());
        });
        return { genres };
      }

      const getLastName = (txt) => txt.split(", ").at(-1).trim();
      const actorSectionName = document.querySelector(".actor-section-name")?.textContent ?? "";
      const sectionName = document.querySelector(".section-name")?.textContent ?? "";

      if (PATHNAME.startsWith("/actors")) return { actors: [getLastName(actorSectionName)] };
      if (PATHNAME.startsWith("/series")) return { series: sectionName };
      if (PATHNAME.startsWith("/makers")) return { maker: getLastName(sectionName) };
      if (PATHNAME.startsWith("/directors")) return { director: getLastName(sectionName) };
      if (PATHNAME.startsWith("/video_codes")) return { prefix: sectionName };
      if (PATHNAME.startsWith("/lists")) return { list: actorSectionName };
      if (PATHNAME.startsWith("/publishers")) return { publisher: getLastName(sectionName) };
      return {};
    };

    const params = getParams();
    const actions = Offline.getActions(config, params);
    if (!actions.length) return;

    const insertActions = (actions) => {
      const actionsTxt = `
        <div class="button ${TARGET_CLASS}" style="position:absolute;top:15px;left:15px;z-index:2">
          ${actions.map(renderAction).join("")}
        </div>
      `;
      const insert = (node) => node.querySelector(".photo-frame").insertAdjacentHTML("beforeend", actionsTxt);
      const insertList = (nodeList) => nodeList.forEach(insert);

      insertList(movieList);
      window.addEventListener("JavDB.scroll", ({ detail }) => insertList(detail));
    };

    const onstart = (target) => {
      target.classList.add(LOAD_CLASS);

      target
        .closest(SELECTOR)
        .querySelectorAll(`.${TARGET_CLASS}`)
        .forEach((item) => item.setAttribute("disabled", ""));
    };

    const onfinally = (target, res) => {
      target
        .closest(SELECTOR)
        .querySelectorAll(`.${TARGET_CLASS}`)
        .forEach((item) => item.removeAttribute("disabled"));

      target.classList.remove(LOAD_CLASS);

      if (res) Req115.sleep(0.5).then(() => unsafeWindow["reMatch"]?.(target));
    };

    const onclick = async (e) => {
      const target = e.target.closest(`.${TARGET_CLASS}`);
      if (!target) return;

      e.preventDefault();
      e.stopPropagation();

      const action = findAction(target.dataset, actions);
      if (!action) return;
      onstart(target);

      try {
        const dom = await Req.request(target.closest("a").href);
        const details = getDetails(dom);
        if (!details) return onfinally(target);

        const { magnetOptions, ...options } = Offline.getOptions(action, details);
        const magnets = Offline.getMagnets(getMagnets(dom), magnetOptions);
        if (!magnets.length) return onfinally(target);

        offline({
          options,
          magnets,
          onfinally: (res) => onfinally(target, res),
        });
      } catch (err) {
        console.warn(err?.message);
        return onfinally(target);
      }
    };

    insertActions(actions);
    document.addEventListener("click", onclick, true);

  }, 2000);
})();
