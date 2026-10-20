
const h = React.createElement;

function App() {
  const [text] = React.useState(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("text") || "")
      .replace(/\\n/g, "\n")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n");
  });

  // 문단마다 한 페이지를 사용합니다.
  const pages = React.useMemo(
    () => text.split("\n").map(s => s.trim()).filter(Boolean),
    [text]
  );

  const [spread, setSpread] = React.useState(0);
  const [turn, setTurn] = React.useState(null);
  const [dragX, setDragX] = React.useState(0);
  const [mobile, setMobile] = React.useState(window.innerWidth <= 700);
  const [voices, setVoices] = React.useState([]);
  const [voiceURI, setVoiceURI] = React.useState("");
  const [voiceOn, setVoiceOn] = React.useState(true);
  const [reading, setReading] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const [rate, setRate] = React.useState(1);
  const [showVoices, setShowVoices] = React.useState(false);
  const [status, setStatus] = React.useState("");

  const dragRef = React.useRef(null);
  const turnTimer = React.useRef(null);
  const stoppedRef = React.useRef(false);
  const utteranceId = React.useRef(0);
  const voicesRef = React.useRef([]);

  // PC: 한 번 넘길 때 문단 하나
  // 모바일: 한 번 넘길 때 문단 하나
  const step = 1;
  const lastSpread = Math.max(0, pages.length - 1);
  const safeSpread = Math.min(spread, lastSpread);
  const displayedPage = pages.length ? safeSpread + 1 : 0;
  const progress = pages.length
    ? displayedPage / pages.length * 100
    : 0;

  React.useEffect(() => {
    function resize() {
      setMobile(window.innerWidth <= 700);
    }

    function loadVoices() {
      if (!("speechSynthesis" in window)) return;

      const list = window.speechSynthesis.getVoices();
      voicesRef.current = list;
      setVoices(list);

      const preferred =
        list.find(v =>
          /microsoft/i.test(v.name) && /^ko[-_]/i.test(v.lang)
        ) ||
        list.find(v => /^ko[-_]/i.test(v.lang)) ||
        list[0];

      if (preferred) {
        setVoiceURI(old =>
          old && list.some(v => v.voiceURI === old)
            ? old
            : preferred.voiceURI
        );
      }
    }

    window.addEventListener("resize", resize);

    if ("speechSynthesis" in window) {
      loadVoices();
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    } else {
      setStatus("이 브라우저는 음성 읽기를 지원하지 않습니다.");
    }

    return () => {
      window.removeEventListener("resize", resize);
      clearTimeout(turnTimer.current);

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      }
    };
  }, []);

  function stopSpeech(showStatus = true) {
    stoppedRef.current = true;
    utteranceId.current++;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setReading(false);
    setPaused(false);

    if (showStatus) setStatus("읽기를 정지했습니다.");
  }

  function changeSpread(direction) {
    if (turn || dragRef.current || !pages.length) return;

    const next = Math.max(
      0,
      Math.min(lastSpread, safeSpread + direction * step)
    );

    if (next === safeSpread) return;

    stopSpeech(false);
    setTurn(direction > 0 ? "next" : "previous");

    turnTimer.current = setTimeout(() => {
      setSpread(next);
      setTurn(null);
      setStatus("");
    }, 620);
  }

  function startDrag(e) {
    if (turn || !pages.length) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId
    };

    setDragX(0);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  }

  function moveDrag(e) {
    if (!dragRef.current) return;

    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      setDragX(dx);
    }
  }

  function endDrag() {
    if (!dragRef.current) return;

    const dx = dragX;
    dragRef.current = null;
    setDragX(0);

    if (Math.abs(dx) > 65) {
      changeSpread(dx < 0 ? 1 : -1);
    }
  }

  function cancelDrag() {
    dragRef.current = null;
    setDragX(0);
  }

  function speak(index) {
    if (!voiceOn || !pages.length) return;

    if (!("speechSynthesis" in window)) {
      setStatus("이 브라우저는 음성 읽기를 지원하지 않습니다.");
      return;
    }

    if (index >= pages.length) {
      setReading(false);
      setPaused(false);
      setStatus("책을 모두 읽었습니다.");
      return;
    }

    stoppedRef.current = false;
    const id = ++utteranceId.current;

    setSpread(index);
    setReading(true);
    setPaused(false);
    setStatus(`읽는 중 · ${index + 1}/${pages.length}`);

    const utterance = new SpeechSynthesisUtterance(pages[index]);
    const selected = voicesRef.current.find(v => v.voiceURI === voiceURI);

    if (selected) utterance.voice = selected;

    utterance.lang = selected?.lang || "ko-KR";
    utterance.rate = Number(rate);

    utterance.onend = () => {
      if (stoppedRef.current || id !== utteranceId.current) return;
      speak(index + 1);
    };

    utterance.onerror = event => {
      if (stoppedRef.current || id !== utteranceId.current) return;

      if (event.error !== "canceled" && event.error !== "interrupted") {
        setReading(false);
        setPaused(false);
        setStatus("음성 재생 중 오류가 발생했습니다.");
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  function startReading() {
    if (!voiceOn || !pages.length) return;

    stopSpeech(false);
    speak(safeSpread);
  }

  function togglePause() {
    if (!voiceOn || !pages.length) return;

    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPaused(false);
      setReading(true);
      setStatus("읽기를 이어갑니다.");
    } else if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setPaused(true);
      setStatus("일시정지했습니다.");
    } else {
      startReading();
    }
  }

  function toggleVoice() {
    if (voiceOn) {
      stopSpeech(false);
      setVoiceOn(false);
      setStatus("음성을 껐습니다.");
    } else {
      setVoiceOn(true);
      setStatus("음성을 켰습니다.");
    }
  }

  function resetBook() {
    stopSpeech(false);
    clearTimeout(turnTimer.current);
    dragRef.current = null;
    setDragX(0);
    setTurn(null);
    setSpread(0);
    setStatus("첫 페이지로 돌아왔습니다.");
  }

  // PC에서는 왼쪽 페이지만 내용을 표시하고
  // 오른쪽 페이지는 항상 빈 페이지로 유지합니다.
  function renderPage(index, side, forceEmpty = false) {
    const content = forceEmpty ? "" : (pages[index] || "");

    return h("section", {
      className: `book-page ${side}`,
      key: side
    },
      h("div", {
        className: "book-page-content" + (!content ? " empty" : "")
      }, content || (!pages.length && !forceEmpty
        ? "읽을 텍스트가 없습니다."
        : "")),

      h("div", { className: "book-page-number" },
        content ? index + 1 : ""
      )
    );
  }

  const angle = Math.max(-180, Math.min(0, dragX * 0.75));

  return h("main", { className: "reader-app" },

    h("nav", { className: "reader-toolbar" },
      h("div", { className: "reader-title" }, "READING ROOM"),

      h("div", { className: "reader-tools" },

        h("a", {
          className: "icon-btn",
          href: "index.html",
          "data-tip": "메인 화면",
          "aria-label": "메인 화면"
        }, "⌂"),

        h("button", {
          className: "icon-btn",
          "data-tip": "음성 설정",
          "aria-label": "음성 설정",
          onClick: () => setShowVoices(v => !v)
        }, "♫"),

        h("button", {
          className: "icon-btn",
          "data-tip": voiceOn ? "음성 끄기" : "음성 켜기",
          "aria-label": voiceOn ? "음성 끄기" : "음성 켜기",
          onClick: toggleVoice
        }, voiceOn ? "◖" : "◌"),

        h("button", {
          className: "icon-btn",
          "data-tip": paused ? "이어 읽기" : reading ? "일시정지" : "읽기 시작",
          "aria-label": "읽기 및 일시정지",
          onClick: togglePause,
          disabled: !pages.length || !voiceOn
        }, paused ? "▶" : reading ? "Ⅱ" : "▶"),

        h("button", {
          className: "icon-btn",
          "data-tip": "읽기 정지",
          "aria-label": "읽기 정지",
          onClick: () => stopSpeech()
        }, "■"),

        h("button", {
          className: "icon-btn",
          "data-tip": "처음으로",
          "aria-label": "처음으로",
          onClick: resetBook
        }, "↺"),

        h("a", {
          className: "icon-btn",
          href: "https://typecast.ai/kr/",
          target: "_blank",
          rel: "noopener noreferrer",
          "data-tip": "Typecast 사이트",
          "aria-label": "Typecast 사이트"
        }, "T")
      )
    ),

    showVoices && h("section", { className: "reader-voice-panel" },
      h("label", null, "음성 선택"),
      h("select", {
        value: voiceURI,
        onChange: e => setVoiceURI(e.target.value)
      }, voices.map((v, i) =>
        h("option", {
          key: v.voiceURI || i,
          value: v.voiceURI
        }, `${v.name} (${v.lang})`)
      )),

      h("label", null, `읽기 속도 ${rate.toFixed(2)}x`),
      h("input", {
        type: "range",
        min: 0.6,
        max: 1.5,
        step: 0.05,
        value: rate,
        onChange: e => setRate(Number(e.target.value))
      })
    ),

    h("section", { className: "book-stage" },
      h("div", {
        className: "book-spread",
        onPointerDown: startDrag,
        onPointerMove: moveDrag,
        onPointerUp: endDrag,
        onPointerCancel: cancelDrag,
        onLostPointerCapture: cancelDrag
      },

        mobile
          ? renderPage(safeSpread, "right")
          : h(React.Fragment, null,
              renderPage(safeSpread, "left"),
              renderPage(safeSpread + 1, "right", true)
            ),

        turn && h("div", {
          className: `turn-sheet ${turn}`
        },
          h("div", { className: "turn-face front" },
            h("p", null,
              turn === "next"
                ? pages[safeSpread] || ""
                : pages[safeSpread] || ""
            )
          ),
          h("div", { className: "turn-face back" },
            h("p", null,
              turn === "next"
                ? pages[Math.min(safeSpread + 1, pages.length - 1)] || ""
                : pages[Math.max(0, safeSpread - 1)] || ""
            )
          )
        )
      )
    ),

    h("footer", { className: "reader-bottom" },
      h("span", null, `${displayedPage} / ${pages.length}`),

      h("div", { className: "reader-progress" },
        h("div", { style: { width: progress + "%" } })
      ),

      h("button", {
        className: "icon-btn",
        "data-tip": "이전 페이지",
        "aria-label": "이전 페이지",
        disabled: safeSpread === 0 || !!turn,
        onClick: () => changeSpread(-1)
      }, "‹"),

      h("button", {
        className: "icon-btn",
        "data-tip": "다음 페이지",
        "aria-label": "다음 페이지",
        disabled: safeSpread >= lastSpread || !!turn,
        onClick: () => changeSpread(1)
      }, "›")
    ),

    h("p", { className: "reader-status", role: "status" }, status)
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(App));
