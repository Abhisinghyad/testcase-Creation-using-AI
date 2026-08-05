var $ = function (id) { return document.getElementById(id); };

// ---- footer ----
$("footerYear").textContent = new Date().getFullYear();

// ---- theme ----
var themeIcon = $("themeIcon");
var themeSelect = $("themeSelect");
function setTheme(theme){
  if(theme !== "light" && theme !== "dark"){ theme = "light"; }
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("tcg-theme", theme);
  syncThemeIcon();
}
function syncThemeIcon(){
  var current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  var next = current === "dark" ? "light" : "dark";
  themeIcon.className = current === "dark" ? "bi bi-sun" : "bi bi-moon-stars";
  themeSelect.value = current;
  $("themeToggle").setAttribute("aria-label", "Switch to " + next + " mode");
  $("themeToggle").setAttribute("title", "Switch to " + next + " mode");
}
syncThemeIcon();
if (themeSelect) {
  themeSelect.addEventListener("change", function(){ setTheme(themeSelect.value); });
}
if ($("themeToggle")) {
  $("themeToggle").addEventListener("click", function(){
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    setTheme(next);
  });
}

// ---- screen navigation ----
function show(id){
  ["landingScreen","docScreen","manualScreen","recorderScreen"].forEach(function(s){ $(s).className = (s===id? "" : "row-hidden"); });
  window.scrollTo(0,0);
}
if ($("goManual")) { $("goManual").addEventListener("click", function(){ show("manualScreen"); }); }
if ($("goManualRecorder")) { $("goManualRecorder").addEventListener("click", function(){ show("manualScreen"); }); }
if ($("goDocs")) { $("goDocs").addEventListener("click", function(){ show("docScreen"); }); }
if ($("goRecorder")) { $("goRecorder").addEventListener("click", function(){ show("recorderScreen"); }); }
document.querySelectorAll("[data-back]").forEach(function(b){ b.addEventListener("click", function(){ show("landingScreen"); }); });

// ---- recorder studio elements ----
var recorderUrl=$("recorderUrl");
var recorderTestSteps=$("recorderTestSteps");
var recorderScript=$("recorderScript");
var recorderVerifyBtn=$("recorderVerifyBtn");
var recorderDownloadBtn=$("recorderDownloadBtn");
var recorderProject=$("recorderProject");
var recorderEnvironment=$("recorderEnvironment");
var recorderLivePanel=$("recorderLivePanel");
var recorderTimer=$("recorderTimer");
var recorderSteps=$("recorderSteps");
var recorderSessionStatus=$("recorderSessionStatus");
var recorderProgressPanel=$("recorderProgressPanel");
var recorderProgressFill=$("recorderProgressFill");
var recorderProgressPct=$("recorderProgressPct");
var recorderProgressText=$("recorderProgressText");
var recorderStatusMessage=$("recorderStatusMessage");
if (recorderProject && recorderProject.value) {
  syncRecorderEnvironmentOptions(recorderProject.value);
}

// ---- shared generate result handling ----
var lastBlob=null, timer=null, prog=0, downloadName="TestCases.xlsx";
var recorderVerifyState = false;
function setBar(p){ $("fill").style.width=p+"%"; $("pct").textContent=Math.round(p)+"%"; }
function startProgress(sub, opts){
  opts = opts || {};
  prog=0;
  if (opts.inlineProgress) {
    var panel = opts.progressPanel || recorderProgressPanel;
    var fill = opts.progressFill || recorderProgressFill;
    var pct = opts.progressPct || recorderProgressPct;
    var text = opts.progressText || recorderProgressText;
    if (panel) panel.classList.remove("row-hidden");
    if (text) text.textContent=sub;
    if (fill) fill.style.width="0%";
    if (pct) pct.textContent="0%";
    timer=setInterval(function(){ if(prog<95){ prog+=Math.max(0.4,(95-prog)*0.03); if (fill) fill.style.width=prog+"%"; if (pct) pct.textContent=Math.round(prog)+"%"; } },500);
    return;
  }
  $("progSub").textContent=sub; prog=0; setBar(0); $("progressOverlay").className="overlay show";
  timer=setInterval(function(){ if(prog<95){ prog+=Math.max(0.4,(95-prog)*0.03); setBar(prog);} },500);
}
function stopProgress(v, opts){
  opts = opts || {};
  clearInterval(timer);
  if (opts.inlineProgress) {
    var fill = opts.progressFill || recorderProgressFill;
    var pct = opts.progressPct || recorderProgressPct;
    if (fill) fill.style.width=v+"%";
    if (pct) pct.textContent=Math.round(v)+"%";
    return;
  }
  setBar(v);
}
function resetRecorderVerifyState(){ recorderVerifyState = false; $("verifyBtn").style.display = "none"; $("downloadBtn").style.display = "none"; if (recorderVerifyBtn) recorderVerifyBtn.style.display = "none"; if (recorderDownloadBtn) recorderDownloadBtn.style.display = "none"; }

function runGenerate(fetchPromise, label, button, opts){
  opts = opts || {};
  var isText = !!opts.text;
  button.disabled=true;
  startProgress(opts.progressMsg || ("Building "+label+". This usually takes under a minute."), opts);
  fetchPromise
    .then(function(r){
      if(!r.ok){ return r.text().then(function(t){ var m=""; try{ m=JSON.parse(t).message||JSON.parse(t).error; }catch(e){ m=t; } throw new Error(m||("Failed (HTTP "+r.status+")")); }); }
      var cd=r.headers.get("Content-Disposition")||""; var mm=/filename="?([^";]+)"?/.exec(cd);
      downloadName = (mm&&mm[1]) ? mm[1] : (isText ? "Output.txt" : "TestCases.xlsx");
      return isText ? r.text() : r.arrayBuffer();
    })
    .then(function(data){
      if(isText && opts.onTextData){ opts.onTextData(data); }
      var blob;
      if(isText){
        if(!data || !data.trim()){ throw new Error("No output was generated."); }
        blob = new Blob([data],{type:"text/plain"});
      } else {
        var arr=new Uint8Array(data);
        if(arr.length<600 || arr[0]!==0x50 || arr[1]!==0x4B){ throw new Error("Could not generate a valid Excel. Please check your input and try again."); }
        blob = new Blob([data],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
      }
      lastBlob=blob;
      stopProgress(100, opts);
      setTimeout(function(){
        if (opts.inlineProgress) {
          var panel = opts.progressPanel || recorderProgressPanel;
          var status = opts.statusMessage || recorderStatusMessage;
          var verifyBtn = opts.verifyButton || recorderVerifyBtn;
          var downloadBtn = opts.downloadButton || recorderDownloadBtn;
          if (panel) panel.classList.add("row-hidden");
          if (status) {
            status.classList.remove("row-hidden");
            if (status.querySelector("span")) status.querySelector("span").textContent = opts.doneMsg || "Review the test-case sheet, verify it, and only then download the automation script.";
          }
          if (opts.verifyMode) {
            if (verifyBtn) verifyBtn.style.display="inline-flex";
            if (downloadBtn) downloadBtn.style.display="none";
          }
          return;
        }
        $("progressOverlay").className="overlay";
        $("doneIcon").className="check"; $("doneIcon").innerHTML="&#10003;";
        $("doneTitle").className=""; $("doneTitle").textContent=label+" generated successfully";
        $("doneMsg").textContent=opts.doneMsg || "Your Excel is ready — click Download to save it.";
        if(opts.verifyMode){
          recorderVerifyState = false;
          $("verifyBtn").style.display="block";
          $("downloadBtn").style.display="none";
          $("downloadBtn").textContent="Download Excel";
          recorderVerifyBtn.style.display="inline-flex";
          recorderDownloadBtn.style.display="none";
        } else {
          $("verifyBtn").style.display="none";
          $("downloadBtn").style.display="block";
        }
        $("doneOverlay").className="overlay show";
      },450);
    })
    .catch(function(err){
      stopProgress(0); $("progressOverlay").className="overlay";
      $("doneIcon").className="check err"; $("doneIcon").innerHTML="&#33;";
      $("doneTitle").className="err"; $("doneTitle").textContent="Generation failed";
      $("doneMsg").textContent=err.message;
      $("downloadBtn").style.display="none";
      $("doneOverlay").className="overlay show";
    })
    .then(function(){ button.disabled=false; });
}
if ($("verifyBtn")) {
  $("verifyBtn").addEventListener("click", function(){
    recorderVerifyState = true;
    $("doneMsg").textContent="Verification complete. Review is approved — you can download the generated output now.";
    $("verifyBtn").style.display="none";
    $("downloadBtn").style.display="block";
    if (recorderVerifyBtn) recorderVerifyBtn.style.display="none";
    if (recorderDownloadBtn) recorderDownloadBtn.style.display="inline-flex";
  });
}
if (recorderVerifyBtn) {
  recorderVerifyBtn.addEventListener("click", function(){
    recorderVerifyState = true;
    recorderVerifyBtn.style.display="none";
    recorderDownloadBtn.style.display="inline-flex";
    if (recorderStatusMessage) {
      recorderStatusMessage.classList.remove("row-hidden");
      recorderStatusMessage.querySelector("span").textContent="Verification complete. Review is approved — you can download the generated output now.";
    }
  });
}
if (recorderDownloadBtn) {
  recorderDownloadBtn.addEventListener("click", function(){
    if(!lastBlob) return;
    if(recorderVerifyState === false){
      alert("Please verify the generated test-case sheet before downloading.");
      return;
    }
    var url=URL.createObjectURL(lastBlob); var a=document.createElement("a");
    a.href=url; a.download=downloadName; document.body.appendChild(a); a.click();
    setTimeout(function(){ a.remove(); URL.revokeObjectURL(url); },3000);
  });
}
if ($("downloadBtn")) {
  $("downloadBtn").addEventListener("click", function(){
    if(!lastBlob) return;
    if(recorderVerifyState === false){
      alert("Please verify the generated test-case sheet before downloading.");
      return;
    }
    var url=URL.createObjectURL(lastBlob); var a=document.createElement("a");
    a.href=url; a.download=downloadName; document.body.appendChild(a); a.click();
    setTimeout(function(){ a.remove(); URL.revokeObjectURL(url); },3000);
  });
}
if ($("closeBtn")) {
  $("closeBtn").addEventListener("click", function(){ $("doneOverlay").className="overlay"; resetRecorderVerifyState(); });
}

// ======================= DOCUMENTS FLOW =======================
var im=$("inputMethod");
im.addEventListener("change", function(){
  var p=im.value==="File Path"; $("pathRow").className=p?"":"row-hidden"; $("uploadRow").className=p?"row-hidden":"";
});
var fileInput=$("brdFile");
fileInput.addEventListener("change", function(){
  if(fileInput.files.length){ $("fileName").textContent=fileInput.files[0].name; $("removeFileBtn").className="fb-remove"; }
  else { $("fileName").textContent="Choose a file…"; $("removeFileBtn").className="fb-remove row-hidden"; }
});
$("removeFileBtn").addEventListener("click", function(){ fileInput.value=""; $("fileName").textContent="Choose a file…"; $("removeFileBtn").className="fb-remove row-hidden"; });
function updateTcFields(){ var s=$("genTestCases").checked; $("preConditionsField").className=s?"field":"field row-hidden"; $("testStepsField").className=s?"field":"field row-hidden"; }
$("genTestCases").addEventListener("change", updateTcFields); updateTcFields();

$("docForm").addEventListener("submit", function(e){
  e.preventDefault();
  var outputs=[];
  if($("genUserStories").checked) outputs.push("UserStories");
  if($("genScenarios").checked) outputs.push("Scenarios");
  if($("genTestCases").checked) outputs.push("TestCases");
  if(!outputs.length){ alert("Please select at least one item to generate."); return; }
  var method=im.value;
  if($("genTestCases").checked){
    if(!$("preConditions").value.trim()){ alert("Preconditions are required when generating Test Cases."); return; }
    if(!$("testSteps").value.trim()){ alert("Default Test Steps are required when generating Test Cases."); return; }
  }
  var fd=new FormData();
  fd.append("inputMethod", method);
  fd.append("brdFilePath", $("brdFilePath").value.trim());
  fd.append("preConditions", $("preConditions").value);
  fd.append("testSteps", $("testSteps").value);
  fd.append("description", $("description").value);
  fd.append("outputs", outputs.join(","));
  if(method==="Upload File"){
    if(!fileInput.files.length){ alert("Please choose a BRD file."); return; }
    fd.append("brdFile", fileInput.files[0]);
  } else if(!$("brdFilePath").value.trim()){ alert("Please enter the BRD file path."); return; }

  var label = outputs.map(function(o){ return {UserStories:"User Stories",Scenarios:"Test Scenarios",TestCases:"Test Cases"}[o]; }).join(", ");
  runGenerate(fetch("/generate-testcases",{method:"POST",body:fd}), label, $("docGenBtn"));
});

// ======================= SCENARIOS FLOW =======================
var manualTestSteps=$("manualTestSteps"), manualTarget=$("manualTarget"), manualProject=$("manualProject"), manualEnvironment=$("manualEnvironment"), manualUrl=$("manualUrl"), manualScript=$("manualScript"), manualVerifyBtn=$("manualVerifyBtn"), manualDownloadBtn=$("manualDownloadBtn");
var manualProgressPanel=$("manualProgressPanel"), manualProgressFill=$("manualProgressFill"), manualProgressPct=$("manualProgressPct"), manualProgressText=$("manualProgressText"), manualStatusMessage=$("manualStatusMessage");
var manualVerifyState = false;
if (manualProject && manualProject.value) {
  syncEnvironmentOptions(manualProject.value, manualEnvironment);
}
if (manualProject) {
  manualProject.addEventListener("change", function(){
    syncEnvironmentOptions(manualProject.value, manualEnvironment);
    if (!manualProject.value) {
      if (manualEnvironment) { manualEnvironment.disabled = true; manualEnvironment.value = ""; }
    }
    if (manualUrl) manualUrl.value = "";
  });
}
if (manualEnvironment) {
  manualEnvironment.disabled = true;
  manualEnvironment.addEventListener("change", function(){
    syncManualUrlByEnvironment(manualProject.value, manualEnvironment.value);
  });
}
function syncManualUrlByEnvironment(project, environment){
  var urlMap = recorderProjectEnvUrls[project] || {};
  if (manualUrl) manualUrl.value = urlMap[environment] || "";
}
function renderManualScript(text){
  if (manualScript) manualScript.value = (text || '').trim();
}
if (manualVerifyBtn) {
  manualVerifyBtn.addEventListener("click", function(){
    manualVerifyState = true;
    manualVerifyBtn.style.display = "none";
    manualDownloadBtn.style.display = "inline-flex";
  });
}
if (manualDownloadBtn) {
  manualDownloadBtn.addEventListener("click", function(){
    if(!lastBlob) return;
    if(manualVerifyState === false){ alert("Please verify the generated automation script before downloading."); return; }
    var url=URL.createObjectURL(lastBlob); var a=document.createElement("a");
    a.href=url; a.download=downloadName; document.body.appendChild(a); a.click();
    setTimeout(function(){ a.remove(); URL.revokeObjectURL(url); },3000);
  });
}
$("scenariosGenBtn").addEventListener("click", function(){
  var text = manualTestSteps ? manualTestSteps.value.trim() : "";
  if(!text){ if (manualTestSteps) manualTestSteps.classList.add("invalid"); manualTestSteps.focus(); alert("Please enter at least one test step."); return; }
  if (!manualProject || !manualProject.value) { alert("Please select a project."); return; }
  if (!manualEnvironment || !manualEnvironment.value) { alert("Please select an environment."); return; }
  if (!manualUrl || !manualUrl.value.trim()) { alert("Please select a valid project and environment to derive the starting URL."); return; }
  manualVerifyState = false;
  if (manualVerifyBtn) manualVerifyBtn.style.display = "none";
  if (manualDownloadBtn) manualDownloadBtn.style.display = "none";
  startProgress("Opening the browser instance and capturing the manual actions.", {
    inlineProgress: true,
    progressPanel: manualProgressPanel,
    progressFill: manualProgressFill,
    progressPct: manualProgressPct,
    progressText: manualProgressText,
    statusMessage: manualStatusMessage,
    verifyButton: manualVerifyBtn,
    downloadButton: manualDownloadBtn
  });
  runGenerate(
    fetch("/recorder/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:manualUrl.value.trim(),project:manualProject.value,environment:manualEnvironment.value,target:manualTarget.value})}),
    "Automation script", $("scenariosGenBtn"),
    {
      text:true,
      onTextData: renderManualScript,
      progressMsg:"Opening the browser instance and capturing the manual actions.",
      doneMsg:"Review the generated script, verify it, and then download it.",
      verifyMode:true,
      inlineProgress:true,
      progressPanel: manualProgressPanel,
      progressFill: manualProgressFill,
      progressPct: manualProgressPct,
      progressText: manualProgressText,
      statusMessage: manualStatusMessage,
      verifyButton: manualVerifyBtn,
      downloadButton: manualDownloadBtn
    }
  );
});

// ======================= RECORDER STUDIO =======================
var recorderSessionTimer = null;
var recorderSessionSeconds = 0;
function formatRecorderTimer(seconds){
  var mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  var secs = (seconds % 60).toString().padStart(2, '0');
  return mins + ':' + secs;
}
function startRecorderLiveSession(){
  recorderSessionSeconds = 0;
  recorderTimer.textContent = formatRecorderTimer(recorderSessionSeconds);
  recorderSessionStatus.textContent = 'Recording session is active';
  recorderLivePanel.className = 'field recorder-live-panel';
  recorderSteps.innerHTML = '<li>Session started. Capture steps in the page below.</li>';
  recorderSessionTimer = setInterval(function(){
    recorderSessionSeconds += 1;
    recorderTimer.textContent = formatRecorderTimer(recorderSessionSeconds);
  }, 1000);
}
function stopRecorderLiveSession(){
  if(recorderSessionTimer){ clearInterval(recorderSessionTimer); recorderSessionTimer = null; }
  recorderSessionStatus.textContent = 'Recording session finished';
}
function syncRecorderNoteList(){
  var lines = recorderTestSteps.value.split(/\r?\n/).map(function(line){ return line.trim(); }).filter(Boolean);
  if(!lines.length){
    recorderSteps.innerHTML = '<li>Session started. Recorded steps will be listed here once the browser session closes.</li>';
    return;
  }
  recorderSteps.innerHTML = lines.map(function(line){ return '<li>' + line + '</li>'; }).join('');
}
function renderRecorderSteps(text){
  recorderScript.value = (text || '').trim();
  var lines = (text || '').split(/\r?\n/).map(function(line){ return line.trim(); }).filter(Boolean);
  var parts = [];
  var generatedStepText = [];
  var stepNumber = 1;

  function getRoleName(line){
    var m = line.match(/getByRole\(\s*['"]([^'"]+)['"]\s*,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\}\s*\)/i);
    if (m) return { role: m[1], name: m[2] };
    return null;
  }
  function getLocatorName(line){
    var role = getRoleName(line);
    if (role) return role.name + ' ' + role.role;
    if (/TxtName/.test(line)) return 'username field';
    if (/TxtPassword/.test(line)) return 'password field';
    if (/css-14al3fd/.test(line)) return 'object action icon';
    if (/acid-card_actions_Card_150283/.test(line)) return 'card action object';
    var selector = line.match(/locator\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (selector) return selector[1];
    var label = line.match(/getByLabel\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (label) return label[1];
    var placeholder = line.match(/getByPlaceholder\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (placeholder) return placeholder[1];
    var text = line.match(/getByText\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (text) return text[1];
    return 'the target element';
  }
  function addStep(stepText, humanText){
    parts.push(stepText);
    generatedStepText.push(humanText);
  }

  generatedStepText.push('NA');

  lines.forEach(function(line){
    var gotoMatch = line.match(/page\.goto\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (gotoMatch) {
      addStep('Navigated to ' + gotoMatch[1] + '.', stepNumber + '. Navigate to ' + gotoMatch[1] + '.');
      stepNumber += 1;
      return;
    }

    var fillMatch = line.match(/\.fill\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (fillMatch) {
      var field = getLocatorName(line);
      var value = fillMatch[1];
      var human = /username field/.test(field)
        ? 'Enter username "' + value + '".'
        : /password field/.test(field)
          ? 'Enter password "' + value + '".'
          : 'Enter value "' + value + '" in ' + field + '.';
      addStep('Entered value "' + value + '" in ' + field + '.', stepNumber + '. ' + human);
      stepNumber += 1;
      return;
    }

    var pressMatch = line.match(/\.press\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (pressMatch) {
      var key = pressMatch[1];
      addStep('Pressed the ' + key + ' key.', stepNumber + '. Press the ' + key + ' key.');
      stepNumber += 1;
      return;
    }

    var clickMatch = line.match(/\.click\(\s*\)/i);
    if (clickMatch) {
      var role = getRoleName(line);
      if (role) {
        addStep('Clicked the ' + role.name + ' ' + role.role + '.', stepNumber + '. Click the ' + role.name + ' ' + role.role + '.');
        stepNumber += 1;
      } else {
        var selector = getLocatorName(line);
        addStep('Clicked ' + selector + '.', stepNumber + '. Click ' + selector + '.');
        stepNumber += 1;
      }
      return;
    }

    var selectMatch = line.match(/\.selectOption\(\s*['"]([^'"]+)['"]\s*\)/i);
    if (selectMatch) {
      var selectedValue = selectMatch[1];
      addStep('Selected option "' + selectedValue + '".', stepNumber + '. Select option "' + selectedValue + '".');
      stepNumber += 1;
      return;
    }

    var waitMatch = line.match(/waitForTimeout\(([^\)]*)\)/i);
    if (waitMatch) {
      addStep('Waited for the page to finish loading.', stepNumber + '. Wait for the page to finish loading.');
      stepNumber += 1;
      return;
    }
  });

  if (!parts.length) {
    parts.push('No explicit recorded actions were detected in the generated script.');
    generatedStepText.push('No explicit recorded actions were detected.');
  }

  recorderSteps.innerHTML = generatedStepText.map(function(step){ return '<li>' + step + '</li>'; }).join('');
  recorderTestSteps.value = generatedStepText.join('\n');
  stopRecorderLiveSession();
}
var recorderProjectEnvOptions = {
  "Security bank of Corporation": [
    { value: "Dev", text: "Dev" },
    { value: "QA", text: "QA" },
    { value: "UAT", text: "UAT" },
    { value: "Staging", text: "Staging" },
    { value: "Prod", text: "Prod" }
  ],
  "National Bank of Oman": [
    { value: "SA", text: "SA" },
    { value: "DEV", text: "DEV" },
    { value: "Load", text: "Load" }
  ]
};
var recorderProjectEnvUrls = {
  "National Bank of Oman": {
    "SA": "https://m9.businessbywire.com/appsa/login/login",
    "DEV": "https://m9.businessbywire.com/appdev/login/login",
    "Load": "https://m9.businessbywire.com/appnload/login/login"
  }
};
function syncEnvironmentOptions(project, envSelect){
  var opts = recorderProjectEnvOptions[project] || [];
  envSelect.innerHTML = '<option value="">Select Environment</option>' + opts.map(function(o){
    return '<option value="' + o.value + '">' + o.text + '</option>';
  }).join('');
  envSelect.disabled = !opts.length;
  envSelect.value = "";
}
function syncRecorderEnvironmentOptions(project){
  syncEnvironmentOptions(project, recorderEnvironment);
}
function syncRecorderUrlByEnvironment(project, environment){
  var urlMap = recorderProjectEnvUrls[project] || {};
  if (urlMap[environment]) {
    recorderUrl.value = urlMap[environment];
    recorderUrl.classList.remove("invalid");
  }
}
recorderUrl.addEventListener("input", function(){ recorderUrl.classList.remove("invalid"); });
recorderProject.addEventListener("change", function(){
  recorderProject.classList.remove("invalid");
  syncRecorderEnvironmentOptions(recorderProject.value);
  recorderUrl.value = "";
});
recorderEnvironment.addEventListener("change", function(){
  recorderEnvironment.classList.remove("invalid");
  syncRecorderUrlByEnvironment(recorderProject.value, recorderEnvironment.value);
});
$("recorderGenBtn").addEventListener("click", function(){
  var url = recorderUrl.value.trim();
  var project = recorderProject.value.trim();
  var environment = recorderEnvironment.value.trim();
  if(!url){ recorderUrl.classList.add("invalid"); recorderUrl.focus(); alert("Please enter a starting URL."); return; }
  if(!project){ recorderProject.classList.add("invalid"); recorderProject.focus(); alert("Please select a project."); return; }
  if(!environment){ recorderEnvironment.classList.add("invalid"); recorderEnvironment.focus(); alert("Please select an environment."); return; }
  var target = $("recorderTarget").value;
  recorderTestSteps.value = '';
  recorderScript.value = '';
  recorderVerifyBtn.style.display = 'none';
  recorderDownloadBtn.style.display = 'none';
  startRecorderLiveSession();
  runGenerate(
    fetch("/recorder/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:url,project:project,environment:environment,target:target})}),
    "Automation script", $("recorderGenBtn"),
    {
      text:true,
      onTextData: renderRecorderSteps,
      progressMsg:"Opening the browser recording session. Close the browser window when you are done.",
      doneMsg:"Review the test-case style step sheet above, then verify it before downloading the script.",
      verifyMode:true,
      inlineProgress:true
    }
  );
});
