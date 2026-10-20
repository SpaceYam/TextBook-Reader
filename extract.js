
const h = React.createElement;
const MAX_FILE_SIZE = 40 * 1024 * 1024;

function App() {
  const [text, setText] = React.useState("");
  const [fileName, setFileName] = React.useState("");
  const [status, setStatus] = React.useState("파일을 선택하세요.");
  const [busy, setBusy] = React.useState(false);

  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setStatus("파일은 40MB 이하로 선택하세요.");
      return;
    }

    const ext = file.name.split(".").pop().toLowerCase();
    setBusy(true);
    setFileName(file.name);

    try {
      let result = "";

      if (["txt", "text", "md", "csv", "log", "json", "xml", "html"].includes(ext)) {
        result = await file.text();

        if (ext === "html") {
          const doc = new DOMParser().parseFromString(result, "text/html");
          doc.querySelectorAll("script,style,noscript").forEach(el => el.remove());
          result = doc.body.innerText || doc.body.textContent || "";
        } else if (ext === "xml") {
          const doc = new DOMParser().parseFromString(result, "application/xml");
          if (doc.querySelector("parsererror")) throw new Error("XML 형식이 올바르지 않습니다.");
          result = doc.documentElement.textContent || "";
        }
      } else if (ext === "pdf") {
        if (!window.pdfjsLib) throw new Error("PDF.js를 불러오지 못했습니다.");

        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        const pdf = await pdfjsLib.getDocument({
          data: new Uint8Array(await file.arrayBuffer())
        }).promise;

        const pages = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();

          // PDF 텍스트 항목의 줄바꿈 정보를 최대한 유지합니다.
          let line = "";
          let previousY = null;
          const lines = [];

          for (const item of content.items) {
            if (!("str" in item)) continue;

            const y = item.transform?.[5];

            if (
              previousY !== null &&
              y !== undefined &&
              Math.abs(y - previousY) > 3
            ) {
              if (line.trim()) lines.push(line.trim());
              line = "";
            }

            line += item.str + (item.hasEOL ? "\n" : " ");
            previousY = y;

            if (item.hasEOL) {
              if (line.trim()) lines.push(line.trim());
              line = "";
              previousY = null;
            }
          }

          if (line.trim()) lines.push(line.trim());

          pages.push(lines.join("\n"));
          setStatus(`PDF 추출 중: ${i}/${pdf.numPages} 페이지`);
        }

        result = pages.join("\n\n");
      } else {
        throw new Error("지원하지 않는 파일입니다. TXT, CSV, MD, PDF, LOG, JSON, HTML, XML을 지원합니다.");
      }

      setText(result);
      setStatus(`추출 완료: ${result.length.toLocaleString()}자`);
    } catch (error) {
      setStatus("오류: " + error.message);
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!text.trim()) {
      setStatus("다운로드할 텍스트가 없습니다.");
      return;
    }

    const blob = new Blob(["\uFEFF", text], {
      type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (fileName.replace(/\.[^.]+$/, "") || "extracted-text") + ".txt";
    a.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function readBook() {
    if (!text.trim()) {
      setStatus("먼저 텍스트를 추출하거나 입력하세요.");
      return;
    }

    try {
      // sessionStorage.setItem("bookReaderText", text);
      // sessionStorage.setItem("bookReaderTitle", fileName || "내 책");
      // location.href = "reader.html?source=extract";
      location.href = "reader.html?text=" + encodeURIComponent(text);
    } catch (error) {
      // 저장 용량 제한에 걸리면 URL 쿼리로 전달합니다.
      location.href = "reader.html?text=" + encodeURIComponent(text);
    }
  }

  return h("main", { className: "app" },
    h("header", null,
      h("div", { className: "eyebrow" }, "TEXT EXTRACTOR"),
      h("h1", null, "텍스트 추출"),
      h("p", null, "파일에서 글자를 추출하고 책 읽기로 전달하세요.")
    ),

    h("section", { className: "panel" },
      h("h2", null, "파일 선택"),

      h("label", { className: "drop" },
        "TXT · CSV · MD · PDF · LOG · JSON · HTML · XML",
        h("input", {
          type: "file",
          accept: ".txt,.text,.csv,.md,.pdf,.log,.json,.html,.xml",
          disabled: busy,
          onChange: upload
        })
      ),

      h("p", { className: "muted" }, fileName || "선택한 파일이 없습니다."),

      h("label", null, "추출된 텍스트"),

      h("textarea", {
        value: text,
        onChange: e => setText(e.target.value),
        placeholder: "추출된 텍스트가 여기에 표시됩니다.",
        spellCheck: false
      }),

      h("div", { className: "counter" },
        `${text.length.toLocaleString()}자`
      ),

      h("div", { className: "actions" },
        h("button", {
          className: "btn primary",
          disabled: busy,
          onClick: download
        }, "TXT 다운로드"),

        h("button", {
          className: "btn success",
          disabled: busy,
          onClick: readBook
        }, "책 읽기로 이동 →"),

        h("button", {
          className: "btn danger",
          disabled: busy,
          onClick: () => {
            setText("");
            setFileName("");
            setStatus("초기화했습니다.");
          }
        }, "초기화"),

        h("a", { className: "btn", href: "index.html" }, "메인")
      )
    ),

    h("section", { className: "panel" },
      h("h2", null, "처리 상태"),
      h("div", { className: "status", role: "status" },
        busy ? "처리 중..." : status
      ),
      h("p", { className: "muted" },
        "스캔 이미지로만 구성된 PDF는 별도 OCR이 필요합니다. 이 페이지는 PDF 내부에 포함된 텍스트를 추출합니다."
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(App));
