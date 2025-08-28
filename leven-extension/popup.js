// Leven Extension Popup Script
document.addEventListener("DOMContentLoaded", function () {
  // 显示当前时间
  const timestamp = document.getElementById("timestamp");
  const now = new Date();
  timestamp.textContent = `Loaded at: ${now.toLocaleString("zh-CN")}`;

  // 添加一些交互功能
  const container = document.querySelector(".container");
  let clickCount = 0;

  container.addEventListener("click", function () {
    clickCount++;
    const status = document.querySelector(".status");

    if (clickCount === 1) {
      status.textContent = "🎉 Clicked once!";
      status.style.background = "rgba(255, 193, 7, 0.2)";
      status.style.borderColor = "rgba(255, 193, 7, 0.3)";
    } else if (clickCount === 2) {
      status.textContent = "🚀 Clicked twice!";
      status.style.background = "rgba(156, 39, 176, 0.2)";
      status.style.borderColor = "rgba(156, 39, 176, 0.3)";
    } else {
      status.textContent = `🔥 Clicked ${clickCount} times!`;
      status.style.background = "rgba(244, 67, 54, 0.2)";
      status.style.borderColor = "rgba(244, 67, 54, 0.3)";
    }

    // 添加点击动画效果
    container.style.transform = "scale(0.95)";
    setTimeout(() => {
      container.style.transform = "scale(1)";
    }, 100);
  });

  // 添加鼠标悬停效果
  container.addEventListener("mouseenter", function () {
    container.style.transform = "scale(1.02)";
    container.style.transition = "transform 0.2s ease";
  });

  container.addEventListener("mouseleave", function () {
    container.style.transform = "scale(1)";
  });

  // 测试Chrome扩展API
  try {
    if (chrome && chrome.runtime) {
      console.log("✅ Chrome runtime API available");

      // 获取扩展信息
      chrome.runtime
        .getManifest()
        .then((manifest) => {
          console.log("✅ Extension manifest loaded:", manifest.name);
        })
        .catch((error) => {
          console.log("⚠️ Could not get manifest:", error);
        });
    } else {
      console.log("⚠️ Chrome runtime API not available");
    }
  } catch (error) {
    console.log("⚠️ Error accessing Chrome API:", error);
  }

  // 添加键盘快捷键支持
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      window.close();
    }
  });
});
