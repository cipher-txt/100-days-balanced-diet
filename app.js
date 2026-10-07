/* =========================================================
   100 DAYS — BALANCED DIET
   Supabase-powered version
   ========================================================= */

const SUPABASE_URL = "https://gaiikrirdociwrcjgiuu.supabase.co";
const SUPABASE_KEY = "sb_publishable_Pa6_otztoPlyt052H325zg_91NJtYkX";

let supabase;
let state = null;
let selectedDate = null;
let editingId = null;
let currentUser = null;
let challengeId = null;

const $ = id => document.getElementById(id);

const iso = d => {
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

const parseDate = s => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const todayISO = () => iso(new Date());

const fmt = d =>
  parseDate(d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

/* =========================================================
   LOAD SUPABASE
   ========================================================= */

function loadSupabase() {
  return new Promise((resolve, reject) => {
    if (window.supabase) {
      supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );
      resolve();
      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

    script.onload = () => {
      supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );
      resolve();
    };

    script.onerror = () =>
      reject(new Error("Could not load Supabase."));

    document.head.appendChild(script);
  });
}

/* =========================================================
   AUTH UI
   ========================================================= */

function createAuthUI() {
  if ($("authPanel")) return;

  const panel = document.createElement("section");

  panel.id = "authPanel";
  panel.className = "panel auth-panel";

  panel.innerHTML = `
    <div class="auth-box">
      <p class="eyebrow">YOUR ACCOUNT</p>
      <h1>100 Days — Balanced Diet</h1>
      <p class="muted">
        Sign in to keep your challenge and meals saved across devices.
      </p>

      <div id="authMessage" class="muted"></div>

      <label>
        Email
        <input id="authEmail" type="email" placeholder="you@example.com">
      </label>

      <label>
        Password
        <input id="authPassword" type="password" placeholder="Password">
      </label>

      <div class="dialog-actions">
        <button id="loginBtn" class="primary">Log in</button>
        <button id="signupBtn" class="secondary">Create account</button>
      </div>
    </div>
  `;

  $("setup").before(panel);

  $("loginBtn").onclick = login;
  $("signupBtn").onclick = signup;
}

function removeAuthUI() {
  const panel = $("authPanel");
  if (panel) panel.remove();
}

function authMessage(message) {
  const el = $("authMessage");
  if (el) el.textContent = message;
}

async function login() {
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;

  if (!email || !password) {
    authMessage("Enter your email and password.");
    return;
  }

  authMessage("Logging in...");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    authMessage(error.message);
    return;
  }

  await afterLogin();
}

async function signup() {
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;

  if (!email || !password) {
    authMessage("Enter an email and password.");
    return;
  }

  if (password.length < 6) {
    authMessage("Password must be at least 6 characters.");
    return;
  }

  authMessage("Creating account...");

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    authMessage(error.message);
    return;
  }

  if (!data.session) {
    authMessage(
      "Account created. Check your email to confirm your account, then log in."
    );
    return;
  }

  await afterLogin();
}

/* =========================================================
   SUPABASE DATA
   ========================================================= */

async function loadChallenge() {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(error);
    alert("Could not load your challenge.");
    return null;
  }

  if (!data) return null;

  challengeId = data.id;

  state = {
    target: Number(data.target),
    startDate: data.start_date,
    days: {}
  };

  const { data: meals, error: mealError } = await supabase
    .from("meals")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("created_at", { ascending: true });

  if (mealError) {
    console.error(mealError);
    alert("Could not load your meals.");
    return null;
  }

  (meals || []).forEach(meal => {
    if (!state.days[meal.meal_date]) {
      state.days[meal.meal_date] = {
        meals: [],
        manualMiss: false
      };
    }

    state.days[meal.meal_date].meals.push({
      id: meal.id,
      name: meal.name,
      cal: Number(meal.calories)
    });
  });

  const { data: misses, error: missError } = await supabase
    .from("day_status")
    .select("*")
    .eq("challenge_id", challengeId);

  if (!missError) {
    (misses || []).forEach(item => {
      if (!state.days[item.day_date]) {
        state.days[item.day_date] = {
          meals: [],
          manualMiss: false
        };
      }

      state.days[item.day_date].manualMiss =
        item.manual_miss === true;
    });
  }

  return state;
}

async function createChallenge(target, date) {
  const { data, error } = await supabase
    .from("challenges")
    .insert({
      user_id: currentUser.id,
      target: target,
      start_date: date
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    alert("Could not create your challenge: " + error.message);
    return false;
  }

  challengeId = data.id;

  state = {
    target: target,
    startDate: date,
    days: {}
  };

  return true;
}

async function saveMealToSupabase(meal) {
  const { error } = await supabase
    .from("meals")
    .insert({
      challenge_id: challengeId,
      meal_date: selectedDate,
      name: meal.name,
      calories: meal.cal
    });

  if (error) {
    console.error(error);
    alert("Could not save the meal: " + error.message);
    return false;
  }

  return true;
}

async function updateMealInSupabase(id, name, calories) {
  const { error } = await supabase
    .from("meals")
    .update({
      name,
      calories
    })
    .eq("id", id)
    .eq("challenge_id", challengeId);

  if (error) {
    console.error(error);
    alert("Could not update the meal.");
    return false;
  }

  return true;
}

async function deleteMealFromSupabase(id) {
  const { error } = await supabase
    .from("meals")
    .delete()
    .eq("id", id)
    .eq("challenge_id", challengeId);

  if (error) {
    console.error(error);
    alert("Could not delete the meal.");
    return false;
  }

  return true;
}

async function saveMissedStatus(date, missed) {
  const { data: existing, error: findError } = await supabase
    .from("day_status")
    .select("id")
    .eq("challenge_id", challengeId)
    .eq("day_date", date)
    .maybeSingle();

  if (findError) {
    console.error(findError);
    return false;
  }

  if (existing) {
    const { error } = await supabase
      .from("day_status")
      .update({
        manual_miss: missed
      })
      .eq("id", existing.id);

    if (error) {
      console.error(error);
      return false;
    }
  } else {
    const { error } = await supabase
      .from("day_status")
      .insert({
        challenge_id: challengeId,
        day_date: date,
        manual_miss: missed
      });

    if (error) {
      console.error(error);
      return false;
    }
  }

  return true;
}

/* =========================================================
   CHALLENGE LOGIC
   ========================================================= */

function dayIndex(date) {
  const start = parseDate(state.startDate);
  const cur = parseDate(date);

  return Math.floor((cur - start) / 86400000) + 1;
}

function validDate(date) {
  return dayIndex(date) >= 1 && dayIndex(date) <= 100;
}

function getDay(date) {
  if (!state.days[date]) {
    state.days[date] = {
      meals: [],
      manualMiss: false
    };
  }

  return state.days[date];
}

function calories(date) {
  return getDay(date).meals.reduce(
    (a, m) => a + Number(m.cal || 0),
    0
  );
}

function status(date) {
  const d = getDay(date);
  const c = calories(date);
  const max = Number(state.target) + 100;

  if (d.manualMiss) return "fail";
  if (!d.meals.length) return "empty";

  return c <= Number(state.target)
    ? "done"
    : c <= max
    ? "warn"
    : "fail";
}

function streak() {
  let s = 0;

  const end = todayISO();
  const start = parseDate(state.startDate);
  const now = parseDate(end);

  if (now < start) return 0;

  const idx = Math.min(
    100,
    Math.floor((now - start) / 86400000) + 1
  );

  for (let i = idx; i >= 1; i--) {
    const d = iso(
      new Date(
        start.getTime() + (i - 1) * 86400000
      )
    );

    if (
      status(d) === "done" ||
      status(d) === "warn"
    ) {
      s++;
    } else {
      break;
    }
  }

  return s;
}

/* =========================================================
   RENDER
   ========================================================= */

function render() {
  if (!state || !selectedDate) return;

  const idx = dayIndex(selectedDate);
  const c = calories(selectedDate);
  const st = status(selectedDate);
  const max = Number(state.target) + 100;

  $("dayNumber").textContent =
    Math.min(100, Math.max(1, idx));

  $("dateLabel").textContent = fmt(selectedDate);

  $("consumed").textContent =
    c.toLocaleString();

  $("target").textContent =
    Number(state.target).toLocaleString();

  $("remaining").textContent =
    Math.max(
      0,
      Number(state.target) - c
    ).toLocaleString();

  $("streak").textContent = streak();

  $("sideTarget").textContent =
    Number(state.target).toLocaleString() +
    " kcal";

  $("sideMax").textContent =
    max.toLocaleString() + " kcal";

  $("limitLabel").textContent =
    "Target + 100 kcal";

  const pct = Math.min(
    100,
    Math.round((c / max) * 100)
  );

  $("percent").textContent = pct + "%";
  $("barFill").style.width = pct + "%";

  const badge = $("dayBadge");
  const msg = $("dayMessage");

  badge.className =
    "badge " +
    (
      st === "done"
        ? "good"
        : st === "warn"
        ? "warn"
        : st === "fail"
        ? "fail"
        : "neutral"
    );

  badge.textContent =
    st === "done"
      ? "Complete"
      : st === "warn"
      ? "+100 allowance used"
      : st === "fail"
      ? "Failed"
      : "Not logged";

  msg.textContent =
    st === "done"
      ? "Within your daily target."
      : st === "warn"
      ? "You are within the extra 100 kcal allowance, but this should not become the everyday target."
      : st === "fail"
      ? "This day is over the allowance or was marked missed. The streak resets."
      : "Log your meals to see today's result.";

  $("completeBtn").textContent =
    getDay(selectedDate).manualMiss
      ? "Undo missed day"
      : "Mark day as missed";

  const list = $("mealList");

  list.innerHTML = "";

  const meals = getDay(selectedDate).meals;

  $("emptyMeals").classList.toggle(
    "hidden",
    meals.length > 0
  );

  meals.forEach(m => {
    const el = document.createElement("div");

    el.className = "meal";

    el.innerHTML = `
      <div>
        <div class="meal-name">
          ${esc(m.name)}
        </div>
        <div class="muted">
          ${Number(m.cal).toLocaleString()} kcal
        </div>
      </div>

      <div class="meal-actions">
        <button class="text-btn"
          onclick="editMeal('${m.id}')">
          Edit
        </button>

        <button class="text-btn"
          onclick="deleteMeal('${m.id}')">
          Delete
        </button>
      </div>
    `;

    list.appendChild(el);
  });

  renderCalendar();
}

function renderCalendar() {
  const cal = $("calendar");

  cal.innerHTML = "";

  const start = parseDate(state.startDate);
  const today = todayISO();

  for (let i = 1; i <= 100; i++) {
    const d = iso(
      new Date(
        start.getTime() + (i - 1) * 86400000
      )
    );

    const s = status(d);

    const el = document.createElement("button");

    el.className =
      "day " +
      s +
      (d === selectedDate ? " selected" : "");

    el.title = `Day ${i} • ${fmt(d)}`;

    el.textContent = i;

    if (d > today) {
      el.classList.add("future");
    }

    el.onclick = () => {
      selectedDate = d;
      render();
    };

    cal.appendChild(el);
  }
}

function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    c =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[c])
  );
}

/* =========================================================
   MEALS
   ========================================================= */

function addMeal() {
  editingId = null;

  $("dialogTitle").textContent = "Add meal";
  $("mealName").value = "";
  $("mealCalories").value = "";

  $("mealDialog").showModal();

  setTimeout(
    () => $("mealName").focus(),
    50
  );
}

function editMeal(id) {
  const m = getDay(selectedDate)
    .meals
    .find(x => x.id === id);

  if (!m) return;

  editingId = id;

  $("dialogTitle").textContent =
    "Edit meal";

  $("mealName").value = m.name;
  $("mealCalories").value = m.cal;

  $("mealDialog").showModal();
}

async function deleteMeal(id) {
  if (!confirm("Delete this meal?")) return;

  const ok = await deleteMealFromSupabase(id);

  if (!ok) return;

  getDay(selectedDate).meals =
    getDay(selectedDate).meals.filter(
      x => x.id !== id
    );

  render();
}

$("mealForm").addEventListener(
  "submit",
  async e => {
    e.preventDefault();

    const name =
      $("mealName").value.trim();

    const cal =
      Number($("mealCalories").value);

    if (!name || cal < 0) return;

    if (editingId) {
      const ok =
        await updateMealInSupabase(
          editingId,
          name,
          cal
        );

      if (!ok) return;

      const m = getDay(selectedDate)
        .meals
        .find(x => x.id === editingId);

      if (m) {
        m.name = name;
        m.cal = cal;
      }
    } else {
      const ok =
        await saveMealToSupabase({
          name,
          cal
        });

      if (!ok) return;

      await loadChallenge();
    }

    $("mealDialog").close();

    render();
  }
);

/* =========================================================
   NAVIGATION
   ========================================================= */

$("addMealBtn").onclick = addMeal;

$("prevBtn").onclick = () => {
  const d = parseDate(selectedDate);

  d.setDate(d.getDate() - 1);

  const x = iso(d);

  if (validDate(x)) {
    selectedDate = x;
    render();
  }
};

$("nextBtn").onclick = () => {
  const d = parseDate(selectedDate);

  d.setDate(d.getDate() + 1);

  const x = iso(d);

  if (validDate(x)) {
    selectedDate = x;
    render();
  }
};

$("todayBtn").onclick = () => {
  const t = todayISO();

  selectedDate =
    validDate(t)
      ? t
      : state.startDate;

  render();
};

/* =========================================================
   MISSED DAY
   ========================================================= */

$("completeBtn").onclick = async () => {
  const d = getDay(selectedDate);

  const newValue = !d.manualMiss;

  const ok =
    await saveMissedStatus(
      selectedDate,
      newValue
    );

  if (!ok) return;

  d.manualMiss = newValue;

  render();
};

/* =========================================================
   SETTINGS
   ========================================================= */

$("settingsBtn").onclick = () => {
  if (!state) return;

  $("settingsTarget").value =
    state.target;

  $("settingsDate").value =
    state.startDate;

  $("settingsDialog").showModal();
};

$("settingsForm").addEventListener(
  "submit",
  async e => {
    e.preventDefault();

    const target =
      Number($("settingsTarget").value);

    const date =
      $("settingsDate").value;

    if (!target || !date) return;

    const { error } = await supabase
      .from("challenges")
      .update({
        target,
        start_date: date
      })
      .eq("id", challengeId)
      .eq("user_id", currentUser.id);

    if (error) {
      alert(
        "Could not save settings: " +
        error.message
      );
      return;
    }

    state.target = target;
    state.startDate = date;

    selectedDate =
      validDate(todayISO())
        ? todayISO()
        : date;

    $("settingsDialog").close();

    render();
  }
);

/* =========================================================
   CREATE FIRST CHALLENGE
   ========================================================= */

$("setupDate").value = todayISO();

$("startBtn").onclick = async () => {
  const target =
    Number($("setupTarget").value);

  const date =
    $("setupDate").value;

  if (!target || target < 1 || !date) {
    alert(
      "Please enter a calorie target and start date."
    );
    return;
  }

  $("startBtn").disabled = true;
  $("startBtn").textContent =
    "Creating challenge...";

  const ok =
    await createChallenge(
      target,
      date
    );

  $("startBtn").disabled = false;
  $("startBtn").textContent =
    "Start my 100 days";

  if (!ok) return;

  $("setup").classList.add("hidden");
  $("app").classList.remove("hidden");

  selectedDate =
    validDate(todayISO())
      ? todayISO()
      : date;

  render();
};

/* =========================================================
   EXPORT
   ========================================================= */

$("exportBtn").onclick = () => {
  const blob = new Blob(
    [
      JSON.stringify(
        state,
        null,
        2
      )
    ],
    {
      type: "application/json"
    }
  );

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  a.download =
    "balanced-diet-100-days.json";

  a.click();

  URL.revokeObjectURL(a.href);
};

/* =========================================================
   IMPORT
   ========================================================= */

$("importInput").onchange = e => {
  const f = e.target.files[0];

  if (!f) return;

  const r = new FileReader();

  r.onload = () => {
    try {
      const x =
        JSON.parse(r.result);

      if (
        !x.target ||
        !x.startDate ||
        !x.days
      ) {
        throw Error();
      }

      alert(
        "Import is only available for backup viewing in this version. Your Supabase data remains unchanged."
      );
    } catch {
      alert(
        "That file is not a valid challenge backup."
      );
    }
  };

  r.readAsText(f);
};

/* =========================================================
   RESET CHALLENGE
   ========================================================= */

$("resetBtn").onclick = async () => {
  if (
    !confirm(
      "Reset the entire 100-day challenge and delete its cloud data?"
    )
  ) {
    return;
  }

  const { error } = await supabase
    .from("challenges")
    .delete()
    .eq("id", challengeId)
    .eq("user_id", currentUser.id);

  if (error) {
    alert(
      "Could not reset the challenge: " +
      error.message
    );
    return;
  }

  state = null;
  challengeId = null;

  location.reload();
};

/* =========================================================
   LOGOUT BUTTON
   ========================================================= */

function createLogoutButton() {
  if ($("logoutBtn")) return;

  const button =
    document.createElement("button");

  button.id = "logoutBtn";
  button.className = "ghost";
  button.textContent = "Log out";

  button.onclick = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  const topbar =
    document.querySelector(".topbar");

  if (topbar) {
    topbar.appendChild(button);
  }
}

/* =========================================================
   LOGIN SUCCESS
   ========================================================= */

async function afterLogin() {
  const {
    data: {
      user
    }
  } = await supabase.auth.getUser();

  currentUser = user;

  if (!currentUser) {
    alert("Could not identify your account.");
    return;
  }

  removeAuthUI();
  createLogoutButton();

  const loaded =
    await loadChallenge();

  if (!loaded) {
    $("setup").classList.remove("hidden");
    $("app").classList.add("hidden");

    $("setupDate").value =
      todayISO();

    return;
  }

  $("setup").classList.add("hidden");
  $("app").classList.remove("hidden");

  selectedDate =
    validDate(todayISO())
      ? todayISO()
      : state.startDate;

  render();
}

/* =========================================================
   START APPLICATION
   ========================================================= */

async function init() {
  try {
    await loadSupabase();

    const {
      data: {
        session
      }
    } = await supabase.auth.getSession();

    if (session) {
      await afterLogin();
    } else {
      $("setup").classList.add("hidden");
      $("app").classList.add("hidden");
      createAuthUI();
    }

    supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (
          event === "SIGNED_IN" &&
          session
        ) {
          await afterLogin();
        }
      }
    );
  } catch (error) {
    console.error(error);

    alert(
      "Supabase could not be loaded. Check your internet connection and try again."
    );
  }
}

init();
