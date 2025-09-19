const canvas = document.getElementById("camera-feed");
    const ctx = canvas.getContext("2d");
    const currentLetterEl = document.getElementById("current-letter");
    const wordEl = document.getElementById("current-word-display");
    const keyboardInput = document.getElementById("keyboard-input");
    const speakBtn = document.getElementById("speakBtn");
    const clearBtn = document.getElementById("clearBtn");
    const toggleVoiceBtn = document.getElementById("toggleVoice");
    const toggleCaptionsBtn = document.getElementById("toggleCaptions");
    const toggleCameraBtn = document.getElementById("toggleCamera");
    const captionsContainer = document.getElementById("text-captions-display");

    let currentWord = "";
    let stableLetter = null;
    let stableCount = 0;
    const STABILITY_THRESHOLD = 25;
    let voiceEnabled = true;
    let captionsEnabled = true;
    let cameraEnabled = true;

    const videoElement = document.createElement("video");
    let frameCounter = 0;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 0,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7,
    });

    hands.onResults(onResults);

    let camera = null;
    function startCamera() {
      if (!camera) {
        camera = new Camera(videoElement, {
          onFrame: async () => {
            if (frameCounter % 3 === 0) {  // process every 3rd frame
              await hands.send({ image: videoElement });
            }
            frameCounter++;
          },
          width: 300,
          height: 400,
        });
      }
      camera.start();
    }
    startCamera();

    function classifyGesture(landmarks) {
      if (!landmarks) return null;
      const [wrist, thumbCMC, thumbMCP, thumbIP, thumbTIP,
            indexMCP, indexPIP, indexDIP, indexTIP,
            middleMCP, middlePIP, middleDIP, middleTIP,
            ringMCP, ringPIP, ringDIP, ringTIP,
            pinkyMCP, pinkyPIP, pinkyDIP, pinkyTIP] = landmarks;

      const isFingerStraight = (tip, pip) => tip.y < pip.y;
      const isFingerBent = (tip, pip) => tip.y > pip.y;

      if (isFingerBent(indexTIP, indexPIP)) return "A";
      if (isFingerStraight(indexTIP, indexPIP) && isFingerStraight(middleTIP, middlePIP)) return "B";
      return null;
    }

    function onResults(results) {
      if (!cameraEnabled) return;

      canvas.width = results.image.width;
      canvas.height = results.image.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        for (const landmarks of results.multiHandLandmarks) {
          drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: "#00e5ff", lineWidth: 1 });
          drawLandmarks(ctx, landmarks, { color: "#ff0000", radius: 1 });
        }
        
        const primaryHand = results.multiHandLandmarks[0];
        const letter = classifyGesture(primaryHand);

        if (captionsEnabled) {
          currentLetterEl.textContent = letter || "-";
        }

        if (letter) {
          if (letter === stableLetter) {
            stableCount++;
            if (stableCount >= STABILITY_THRESHOLD) {
              currentWord += letter;
              if (captionsEnabled) wordEl.textContent = currentWord;
              stableCount = 0;
              stableLetter = null;
            }
          } else {
            stableLetter = letter;
            stableCount = 1;
          }
        } else {
          stableLetter = null;
          stableCount = 0;
        }
      } else {
        if (captionsEnabled) currentLetterEl.textContent = "-";
        stableLetter = null;
        stableCount = 0;
      }
    }

    toggleVoiceBtn.addEventListener("click", () => {
      voiceEnabled = !voiceEnabled;
      toggleVoiceBtn.textContent = `Voice: ${voiceEnabled ? 'ON' : 'OFF'}`;
    });

    toggleCaptionsBtn.addEventListener("click", () => {
      captionsEnabled = !captionsEnabled;
      toggleCaptionsBtn.textContent = `Text: ${captionsEnabled ? 'ON' : 'OFF'}`;
      captionsContainer.style.display = captionsEnabled ? 'block' : 'none';
    });

    toggleCameraBtn.addEventListener("click", () => {
      cameraEnabled = !cameraEnabled;
      toggleCameraBtn.textContent = `Camera: ${cameraEnabled ? 'ON' : 'OFF'}`;
      if (cameraEnabled) {
        startCamera();
      } else {
        camera.stop();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    speakBtn.addEventListener("click", () => {
      const textToSpeak = keyboardInput.value.trim();
      if (textToSpeak && voiceEnabled) {
        let utter = new SpeechSynthesisUtterance(textToSpeak);
        speechSynthesis.speak(utter);
      }
    });

    clearBtn.addEventListener("click", () => {
      keyboardInput.value = "";
    });

