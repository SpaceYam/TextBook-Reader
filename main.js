
const h = React.createElement;

function App() {
  return h("main", { className: "app" },
    h("header", null,
      h("div", { className: "eyebrow" }, "MY READING ROOM"),
      h("h1", null, "나만의 책 읽기"),
      h("p", null, "텍스트를 추출하고, 원하는 속도로 책을 읽어보세요.")
    ),

    h("section", { className: "grid" },
      h("article", { className: "panel" },
        h("h2", null, "텍스트 추출"),
        h("p", null, "TXT, CSV, MD, PDF 파일을 불러와 텍스트를 추출하고 TXT 파일로 저장합니다."),
        h("div", { className: "actions" },
          h("a", { className: "btn primary", href: "extract.html" },
            "파일 열기 →"
          )
        )
      ),

      h("article", { className: "panel" },
        h("h2", null, "책 읽기"),
        h("p", null, "문단별 페이지를 넘기며 무료 브라우저 음성으로 책을 읽습니다."),
        h("div", { className: "actions" },
          h("a", { className: "btn primary", href: "reader.html" },
            "책 읽기 →"
          )
        )
      )
    ),

    h("section", { className: "panel" },
      h("h2", null, "Typecast"),
      h("p", null, "더 자연스러운 AI 음성이 필요하다면 Typecast를 이용하세요."),
      h("a", {
        className: "btn",
        href: "https://typecast.ai/kr/",
        target: "_blank",
        rel: "noopener noreferrer"
      }, "Typecast 바로가기 ↗")
    ),

    h("p", { className: "muted" },
      "별도 npm 설치 없이 HTML 파일로 구성했습니다. PDF 추출에는 인터넷 연결이 필요합니다."
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(App));
