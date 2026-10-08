const SUPABASE_URL =
  "https://gaiikrirdociwrcjgiuu.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_Pa6_otztoPlyt052H325zg_91NJtYkX";

let db = null;
let state = null;
let selectedDate = null;
let editingId = null;
let currentUser = null;
let challengeId = null;

const $ = id =>
  document.getElementById(id);

const iso = d => {

  const x = new Date(d);

  return new Date(
    x.getTime() -
    x.getTimezoneOffset() * 60000
  )
    .toISOString()
    .slice(0, 10);
};

const parseDate = s => {

  const [y, m, d] =
    s.split("-").map(Number);

  return new Date(
    y,
    m - 1,
    d
  );
};

const todayISO = () =>
  iso(new Date());

const fmt = d =>
  parseDate(d).toLocaleDateString(
    undefined,
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }
  );


/* =========================
   SUPABASE
========================= */

function loadSupabase() {

  return new Promise(
    (resolve, reject) => {

      if (
        window.supabase &&
        window.supabase.createClient
      ) {

        db =
          window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
          );

        resolve();
        return;
      }

      const script =
        document.createElement("script");

      script.src =
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

      script.onload = () => {

        if (
          !window.supabase ||
          !window.supabase.createClient
        ) {

          reject(
            new Error(
              "Supabase library loaded incorrectly."
            )
          );

          return;
        }

        db =
          window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
          );

        resolve();
      };

      script.onerror = () => {

        reject(
          new Error(
            "Could not load Supabase."
          )
        );
      };

      document.head.appendChild(script);
    }
  );
}


/* =========================
   AUTH UI
========================= */

function createAuthUI() {

  if ($("authPanel")) {
    return;
  }

  const panel =
    document.createElement("section");

  panel.id =
    "authPanel";

  panel.className =
    "panel auth-panel";

  panel.innerHTML = `
    <div class="auth-box">

      <p class="eyebrow">
        YOUR ACCOUNT
      </p>

      <h1>
        100 Days — Balanced Diet
      </h1>

      <p class="muted">
        Sign in to keep your challenge and meals
        saved across devices.
      </p>

      <div
        id="authMessage"
        class="muted"
      ></div>

      <label>
        Email
        <input
          id="authEmail"
          type="email"
          placeholder="you@example.com"
        >
      </label>

      <label>
        Password
        <input
          id="authPassword"
          type="password"
          placeholder="Password"
        >
      </label>

      <button
        id="forgotPasswordBtn"
        type="button"
        class="ghost"
        style="margin-top:-4px;"
      >
        Forgot password?
      </button>

      <div class="dialog-actions">

        <button
          id="loginBtn"
          class="primary"
          type="button"
        >
          Log in
        </button>

        <button
          id="signupBtn"
          class="secondary"
          type="button"
        >
          Create account
        </button>

      </div>

    </div>
  `;

  $("setup").before(panel);

  $("loginBtn").onclick =
    login;

  $("signupBtn").onclick =
    signup;

  $("forgotPasswordBtn").onclick =
    forgotPassword;
}


function removeAuthUI() {

  const panel =
    $("authPanel");

  if (panel) {
    panel.remove();
  }
}


function authMessage(message) {

  const el =
    $("authMessage");

  if (el) {
    el.textContent =
      message;
  }
}


/* =========================
   PASSWORD RESET UI
========================= */

function createResetPasswordUI() {

  removeAuthUI();

  const oldPanel =
    $("resetPasswordPanel");

  if (oldPanel) {
    oldPanel.remove();
  }

  const panel =
    document.createElement("section");

  panel.id =
    "resetPasswordPanel";

  panel.className =
    "panel auth-panel";

  panel.innerHTML = `
    <div class="auth-box">

      <p class="eyebrow">
        RESET PASSWORD
      </p>

      <h1>
        Create a new password
      </h1>

      <p class="muted">
        Enter a new password for your account.
      </p>

      <div
        id="resetPasswordMessage"
        class="muted"
      ></div>

      <label>
        New password
        <input
          id="newPassword"
          type="password"
          minlength="6"
          placeholder="New password"
        >
      </label>

      <label>
        Confirm password
        <input
          id="confirmPassword"
          type="password"
          minlength="6"
          placeholder="Confirm password"
        >
      </label>

      <button
        id="updatePasswordBtn"
        class="primary"
        type="button"
      >
        Update password
      </button>

    </div>
  `;

  $("setup").before(panel);

  $("updatePasswordBtn").onclick =
    updatePassword;
}


function resetPasswordMessage(message) {

  const el =
    $("resetPasswordMessage");

  if (el) {
    el.textContent =
      message;
  }
}


/* =========================
   FORGOT PASSWORD
========================= */

async function forgotPassword() {

  const email =
    $("authEmail").value.trim();

  if (!email) {

    authMessage(
      "Enter your email address first."
    );

    $("authEmail").focus();

    return;
  }

  authMessage(
    "Sending password reset email..."
  );

  const redirectTo =
    window.location.origin +
    window.location.pathname;

  const {
    error
  } =
    await db.auth.resetPasswordForEmail(
      email,
      {
        redirectTo
      }
    );

  if (error) {

    authMessage(
      "Could not send reset email: " +
      error.message
    );

    return;
  }

  authMessage(
    "Password reset email sent. Check your inbox."
  );
}


/* =========================
   UPDATE PASSWORD
========================= */

async function updatePassword() {

  const password =
    $("newPassword").value;

  const confirm =
    $("confirmPassword").value;

  if (!password || !confirm) {

    resetPasswordMessage(
      "Enter and confirm your new password."
    );

    return;
  }

  if (password.length < 6) {

    resetPasswordMessage(
      "Password must be at least 6 characters."
    );

    return;
  }

  if (password !== confirm) {

    resetPasswordMessage(
      "Passwords do not match."
    );

    return;
  }

  resetPasswordMessage(
    "Updating password..."
  );

  const {
    error
  } =
    await db.auth.updateUser({
      password
    });

  if (error) {

    resetPasswordMessage(
      "Could not update password: " +
      error.message
    );

    return;
  }

  resetPasswordMessage(
    "Password updated successfully. Logging you in..."
  );

  setTimeout(
    async () => {

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

      await afterLogin();

    },
    1000
  );
}


/* =========================
   LOGIN
========================= */

async function login() {

  const email =
    $("authEmail").value.trim();

  const password =
    $("authPassword").value;

  if (!email || !password) {

    authMessage(
      "Enter your email and password."
    );

    return;
  }

  authMessage(
    "Logging in..."
  );

  const {
    error
  } =
    await db.auth.signInWithPassword({
      email,
      password
    });

  if (error) {

    authMessage(
      error.message
    );

    return;
  }

  await afterLogin();
}


/* =========================
   SIGN UP
========================= */

async function signup() {

  const email =
    $("authEmail").value.trim();

  const password =
    $("authPassword").value;

  if (!email || !password) {

    authMessage(
      "Enter an email and password."
    );

    return;
  }

  if (password.length < 6) {

    authMessage(
      "Password must be at least 6 characters."
    );

    return;
  }

  authMessage(
    "Creating account..."
  );

  const {
    data,
    error
  } =
    await db.auth.signUp({
      email,
      password
    });

  if (error) {

    authMessage(
      error.message
    );

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


/* =========================
   LOAD CHALLENGE
========================= */

async function loadChallenge() {

  const {
    data,
    error
  } =
    await db
      .from("challenges")
      .select("*")
      .eq(
        "user_id",
        currentUser.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(1)
      .maybeSingle();

  if (error) {

    console.error(error);

    alert(
      "Could not load your challenge: " +
      error.message
    );

    return null;
  }

  if (!data) {
    return null;
  }

  challengeId =
    data.id;

  state = {
    target:
      Number(data.target),

    startDate:
      data.start_date,

    days: {}
  };


  /* LOAD MEALS */

  const {
    data: meals,
    error: mealError
  } =
    await db
      .from("meals")
      .select("*")
      .eq(
        "challenge_id",
        challengeId
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      );

  if (mealError) {

    console.error(mealError);

    alert(
      "Could not load your meals: " +
      mealError.message
    );

    return null;
  }

  (meals || []).forEach(
    meal => {

      if (
        !state.days[
          meal.meal_date
        ]
      ) {

        state.days[
          meal.meal_date
        ] = {
          meals: [],
          manualMiss: false
        };
      }

      state.days[
        meal.meal_date
      ].meals.push({
        id:
          meal.id,

        name:
          meal.name,

        cal:
          Number(
            meal.calories
          )
      });
    }
  );


  /* LOAD MISSED DAYS */

  const {
    data: misses
  } =
    await db
      .from("day_status")
      .select("*")
      .eq(
        "challenge_id",
        challengeId
      );

  (misses || []).forEach(
    item => {

      if (
        !state.days[
          item.day_date
        ]
      ) {

        state.days[
          item.day_date
        ] = {
          meals: [],
          manualMiss: false
        };
      }

      state.days[
        item.day_date
      ].manualMiss =
        item.manual_miss === true;
    }
  );

  return state;
}


/* =========================
   CREATE CHALLENGE
========================= */

async function createChallenge(
  target,
  date
) {

  const {
    data,
    error
  } =
    await db
      .from("challenges")
      .insert({
        user_id:
          currentUser.id,

        target,

        start_date:
          date
      })
      .select()
      .single();

  if (error) {

    alert(
      "Could not create your challenge: " +
      error.message
    );

    return false;
  }

  challengeId =
    data.id;

  state = {
    target,

    startDate:
      date,

    days: {}
  };

  return true;
}


/* =========================
   DATE FUNCTIONS
========================= */

function dayIndex(date) {

  const start =
    parseDate(
      state.startDate
    );

  const cur =
    parseDate(date);

  return Math.floor(
    (cur - start) /
    86400000
  ) + 1;
}


function validDate(date) {

  return (
    dayIndex(date) >= 1 &&
    dayIndex(date) <= 100
  );
}


function isFutureDate(date) {

  return date > todayISO();
}


/* =========================
   DAY DATA
========================= */

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

  return getDay(date)
    .meals
    .reduce(
      (a, m) =>
        a + Number(m.cal || 0),
      0
    );
}


/* =========================
   DAY STATUS
========================= */

function status(date) {

  const d =
    getDay(date);

  const c =
    calories(date);

  const max =
    Number(state.target) + 100;

  if (d.manualMiss) {
    return "fail";
  }

  if (!d.meals.length) {
    return "empty";
  }

  if (
    c <= Number(state.target)
  ) {
    return "done";
  }

  if (c <= max) {
    return "warn";
  }

  return "fail";
}


/* =========================
   STREAK
========================= */

function streak() {

  if (
    !state ||
    !selectedDate
  ) {
    return 0;
  }

  const selectedIndex =
    dayIndex(
      selectedDate
    );

  if (
    selectedIndex < 1 ||
    selectedIndex > 100
  ) {
    return 0;
  }

  let s = 0;

  for (
    let i = 1;
    i <= selectedIndex;
    i++
  ) {

    const start =
      parseDate(
        state.startDate
      );

    const d =
      iso(
        new Date(
          start.getTime() +
          (i - 1) *
          86400000
        )
      );

    const st =
      status(d);

    if (
      st === "done" ||
      st === "warn"
    ) {

      s++;

    } else {

      break;
    }
  }

  return s;
}


/* =========================
   RENDER
========================= */

function render() {

  if (
    !state ||
    !selectedDate
  ) {
    return;
  }

  const idx =
    dayIndex(
      selectedDate
    );

  const c =
    calories(
      selectedDate
    );

  const st =
    status(
      selectedDate
    );

  const max =
    Number(state.target) + 100;


  /* DAY NUMBER */

  $("dayNumber").textContent =
    Math.min(
      100,
      Math.max(
        1,
        idx
      )
    );


  /* DATE */

  $("dateLabel").textContent =
    fmt(
      selectedDate
    );


  /* STATS */

  $("consumed").textContent =
    c.toLocaleString();

  $("target").textContent =
    Number(
      state.target
    ).toLocaleString();

  $("remaining").textContent =
    Math.max(
      0,
      Number(state.target) - c
    ).toLocaleString();

  $("streak").textContent =
    streak();


  /* SIDE SUMMARY */

  $("sideTarget").textContent =
    Number(
      state.target
    ).toLocaleString() +
    " kcal";

  $("sideMax").textContent =
    max.toLocaleString() +
    " kcal";


  /* PROGRESS */

  const pct =
    Math.min(
      100,
      Math.round(
        (c / max) * 100
      )
    );

  $("percent").textContent =
    pct + "%";

  $("barFill").style.width =
    pct + "%";


  /* STATUS TEXT */

  $("statusText").textContent =
    st === "done"
      ? "Within target"
      : st === "warn"
      ? "Within +100 kcal allowance"
      : st === "fail"
      ? "Day failed"
      : "No meals logged";


  /* BADGE */

  const badge =
    $("dayBadge");

  badge.className =
    "badge " +
    (
      st === "done"
        ? "success"
        : st === "warn"
        ? "warning"
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


  /* MESSAGE */

  $("dayMessage").textContent =
    st === "done"
      ? "Within your daily target."

      : st === "warn"
      ? "Within the extra 100 kcal allowance."

      : st === "fail"
      ? "This day is over the allowance or was marked missed. The streak resets."

      : isFutureDate(
          selectedDate
        )
      ? "This is a future day. You cannot log meals yet."

      : "Log your meals to see today's result.";


  /* MISSED BUTTON */

  $("completeBtn").textContent =
    getDay(
      selectedDate
    ).manualMiss
      ? "Undo missed day"
      : "Mark day as missed";


  /* FUTURE DAY */

  const future =
    isFutureDate(
      selectedDate
    );

  $("addMealBtn").disabled =
    future;

  $("completeBtn").disabled =
    future;


  /* MEALS */

  const list =
    $("mealList");

  list.innerHTML = "";

  const meals =
    getDay(
      selectedDate
    ).meals;

  $("emptyMeals")
    .classList
    .toggle(
      "hidden",
      meals.length > 0
    );

  meals.forEach(
    m => {

      const el =
        document.createElement(
          "div"
        );

      el.className =
        "meal";

      el.innerHTML = `
        <div>

          <div class="meal-name">
            ${esc(m.name)}
          </div>

          <div class="meal-calories">
            ${Number(m.cal).toLocaleString()} kcal
          </div>

        </div>

        <div class="meal-actions">

          <button
            onclick="editMeal('${m.id}')"
            ${future ? "disabled" : ""}
          >
            Edit
          </button>

          <button
            onclick="deleteMeal('${m.id}')"
            ${future ? "disabled" : ""}
          >
            Delete
          </button>

        </div>
      `;

      list.appendChild(el);
    }
  );

  renderCalendar();
}


/* =========================
   CALENDAR
========================= */

function renderCalendar() {

  const cal =
    $("calendar");

  cal.innerHTML = "";

  const start =
    parseDate(
      state.startDate
    );

  const today =
    todayISO();

  for (
    let i = 1;
    i <= 100;
    i++
  ) {

    const d =
      iso(
        new Date(
          start.getTime() +
          (i - 1) *
          86400000
        )
      );

    const el =
      document.createElement(
        "button"
      );

    el.className =
      "day " +
      status(d) +
      (
        d === selectedDate
          ? " selected"
          : ""
      );

    el.textContent =
      i;

    el.title =
      `Day ${i} • ${fmt(d)}`;

    if (d > today) {
      el.classList.add(
        "future"
      );
    }

    el.onclick = () => {

      selectedDate =
        d;

      render();
    };

    cal.appendChild(el);
  }
}


/* =========================
   ESCAPE HTML
========================= */

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


/* =========================
   SAVE MEAL
========================= */

async function saveMeal(
  name,
  cal
) {

  if (
    isFutureDate(
      selectedDate
    )
  ) {

    alert(
      "You cannot add meals to a future day."
    );

    return false;
  }

  const {
    error
  } =
    await db
      .from("meals")
      .insert({
        challenge_id:
          challengeId,

        meal_date:
          selectedDate,

        name,

        calories:
          cal
      });

  if (error) {

    alert(
      "Could not save meal: " +
      error.message
    );

    return false;
  }

  return true;
}


/* =========================
   UPDATE MEAL
========================= */

async function updateMeal(
  id,
  name,
  cal
) {

  if (
    isFutureDate(
      selectedDate
    )
  ) {

    alert(
      "You cannot edit meals on a future day."
    );

    return false;
  }

  const {
    error
  } =
    await db
      .from("meals")
      .update({
        name,
        calories:
          cal
      })
      .eq(
        "id",
        id
      )
      .eq(
        "challenge_id",
        challengeId
      );

  if (error) {

    alert(
      "Could not update meal: " +
      error.message
    );

    return false;
  }

  return true;
}


/* =========================
   DELETE MEAL
========================= */

async function deleteMeal(id) {

  if (
    isFutureDate(
      selectedDate
    )
  ) {

    alert(
      "You cannot delete meals from a future day."
    );

    return;
  }

  if (
    !confirm(
      "Delete this meal?"
    )
  ) {
    return;
  }

  const {
    error
  } =
    await db
      .from("meals")
      .delete()
      .eq(
        "id",
        id
      )
      .eq(
        "challenge_id",
        challengeId
      );

  if (error) {

    alert(
      "Could not delete meal: " +
      error.message
    );

    return;
  }

  getDay(
    selectedDate
  ).meals =
    getDay(
      selectedDate
    ).meals.filter(
      m => m.id !== id
    );

  render();
}


/* =========================
   ADD MEAL
========================= */

function addMeal() {

  if (
    isFutureDate(
      selectedDate
    )
  ) {

    alert(
      "You cannot add meals to a future day."
    );

    return;
  }

  editingId =
    null;

  $("dialogTitle").textContent =
    "Add meal";

  $("mealName").value =
    "";

  $("mealCalories").value =
    "";

  $("mealDialog").showModal();
}


/* =========================
   EDIT MEAL
========================= */

function editMeal(id) {

  if (
    isFutureDate(
      selectedDate
    )
  ) {

    alert(
      "You cannot edit meals on a future day."
    );

    return;
  }

  const meal =
    getDay(
      selectedDate
    )
      .meals
      .find(
        m => m.id === id
      );

  if (!meal) {
    return;
  }

  editingId =
    id;

  $("dialogTitle").textContent =
    "Edit meal";

  $("mealName").value =
    meal.name;

  $("mealCalories").value =
    meal.cal;

  $("mealDialog").showModal();
}


/* =========================
   MEAL FORM
========================= */

$("mealForm").addEventListener(
  "submit",
  async e => {

    e.preventDefault();

    const name =
      $("mealName")
        .value
        .trim();

    const cal =
      Number(
        $("mealCalories")
          .value
      );

    if (
      !name ||
      cal < 0
    ) {
      return;
    }

    if (editingId) {

      const ok =
        await updateMeal(
          editingId,
          name,
          cal
        );

      if (!ok) {
        return;
      }

      const meal =
        getDay(
          selectedDate
        )
          .meals
          .find(
            m =>
              m.id ===
              editingId
          );

      if (meal) {

        meal.name =
          name;

        meal.cal =
          cal;
      }

    } else {

      const ok =
        await saveMeal(
          name,
          cal
        );

      if (!ok) {
        return;
      }

      await loadChallenge();
    }

    $("mealDialog").close();

    render();
  }
);


/* =========================
   BUTTONS
========================= */

$("addMealBtn").onclick =
  addMeal;


$("prevBtn").onclick = () => {

  const d =
    parseDate(
      selectedDate
    );

  d.setDate(
    d.getDate() - 1
  );

  const x =
    iso(d);

  if (validDate(x)) {

    selectedDate =
      x;

    render();
  }
};


$("nextBtn").onclick = () => {

  const d =
    parseDate(
      selectedDate
    );

  d.setDate(
    d.getDate() + 1
  );

  const x =
    iso(d);

  if (validDate(x)) {

    selectedDate =
      x;

    render();
  }
};


$("todayBtn").onclick = () => {

  const t =
    todayISO();

  selectedDate =
    validDate(t)
      ? t
      : state.startDate;

  render();
};


/* =========================
   MARK DAY MISSED
========================= */

$("completeBtn").onclick =
  async () => {

    if (
      isFutureDate(
        selectedDate
      )
    ) {

      alert(
        "You cannot mark a future day as missed."
      );

      return;
    }

    const d =
      getDay(
        selectedDate
      );

    const newValue =
      !d.manualMiss;

    const {
      data: existing
    } =
      await db
        .from("day_status")
        .select("id")
        .eq(
          "challenge_id",
          challengeId
        )
        .eq(
          "day_date",
          selectedDate
        )
        .maybeSingle();

    let error;

    if (existing) {

      ({
        error
      } =
        await db
          .from("day_status")
          .update({
            manual_miss:
              newValue
          })
          .eq(
            "id",
            existing.id
          ));

    } else {

      ({
        error
      } =
        await db
          .from("day_status")
          .insert({
            challenge_id:
              challengeId,

            day_date:
              selectedDate,

            manual_miss:
              newValue
          }));
    }

    if (error) {

      alert(
        "Could not update day status: " +
        error.message
      );

      return;
    }

    d.manualMiss =
      newValue;

    render();
  };


/* =========================
   SETTINGS
========================= */

$("settingsBtn").onclick = () => {

  if (!state) {
    return;
  }

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
      Number(
        $("settingsTarget").value
      );

    const date =
      $("settingsDate").value;

    if (
      !target ||
      !date
    ) {
      return;
    }

    const {
      error
    } =
      await db
        .from("challenges")
        .update({
          target,
          start_date:
            date
        })
        .eq(
          "id",
          challengeId
        )
        .eq(
          "user_id",
          currentUser.id
        );

    if (error) {

      alert(
        "Could not save settings: " +
        error.message
      );

      return;
    }

    state.target =
      target;

    state.startDate =
      date;

    selectedDate =
      validDate(
        todayISO()
      )
        ? todayISO()
        : date;

    $("settingsDialog").close();

    render();
  }
);


/* =========================
   SETUP
========================= */

$("setupDate").value =
  todayISO();


$("startBtn").onclick =
  async () => {

    const target =
      Number(
        $("setupTarget").value
      );

    const date =
      $("setupDate").value;

    if (
      !target ||
      target < 1 ||
      !date
    ) {

      alert(
        "Please enter a calorie target and start date."
      );

      return;
    }

    $("startBtn").disabled =
      true;

    $("startBtn").textContent =
      "Creating challenge...";

    const ok =
      await createChallenge(
        target,
        date
      );

    $("startBtn").disabled =
      false;

    $("startBtn").textContent =
      "Start my 100 days";

    if (!ok) {
      return;
    }

    $("setup")
      .classList
      .add("hidden");

    $("app")
      .classList
      .remove("hidden");

    selectedDate =
      validDate(
        todayISO()
      )
        ? todayISO()
        : date;

    render();
  };


/* =========================
   EXPORT
========================= */

$("exportBtn").onclick = () => {

  const blob =
    new Blob(
      [
        JSON.stringify(
          state,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );

  const a =
    document.createElement(
      "a"
    );

  a.href =
    URL.createObjectURL(
      blob
    );

  a.download =
    "balanced-diet-100-days.json";

  a.click();

  URL.revokeObjectURL(
    a.href
  );
};


/* =========================
   RESET
========================= */

$("resetBtn").onclick =
  async () => {

    if (
      !confirm(
        "Reset the entire 100-day challenge?"
      )
    ) {
      return;
    }

    const {
      error
    } =
      await db
        .from("challenges")
        .delete()
        .eq(
          "id",
          challengeId
        )
        .eq(
          "user_id",
          currentUser.id
        );

    if (error) {

      alert(
        "Could not reset challenge: " +
        error.message
      );

      return;
    }

    location.reload();
  };


/* =========================
   IMPORT
========================= */

$("importInput").onchange =
  e => {

    const file =
      e.target.files[0];

    if (!file) {
      return;
    }

    alert(
      "Import will be added after the main tracker is working."
    );
  };


/* =========================
   LOGOUT
========================= */

function createLogoutButton() {

  if ($("logoutBtn")) {
    return;
  }

  const button =
    document.createElement(
      "button"
    );

  button.id =
    "logoutBtn";

  button.className =
    "ghost";

  button.textContent =
    "Log out";

  button.onclick =
    async () => {

      await db.auth.signOut();

      location.reload();
    };

  document
    .querySelector(
      ".topbar"
    )
    .appendChild(button);
}


/* =========================
   AFTER LOGIN
========================= */

async function afterLogin() {

  const {
    data: {
      user
    }
  } =
    await db.auth.getUser();

  currentUser =
    user;

  if (!currentUser) {
    return;
  }

  const resetPanel =
    $("resetPasswordPanel");

  if (resetPanel) {
    resetPanel.remove();
  }

  removeAuthUI();

  createLogoutButton();

  const loaded =
    await loadChallenge();

  if (!loaded) {

    $("setup")
      .classList
      .remove("hidden");

    $("app")
      .classList
      .add("hidden");

    $("setupDate").value =
      todayISO();

    return;
  }

  $("setup")
    .classList
    .add("hidden");

  $("app")
    .classList
    .remove("hidden");

  selectedDate =
    validDate(
      todayISO()
    )
      ? todayISO()
      : state.startDate;

  render();
}


/* =========================
   INITIALIZE
========================= */

async function init() {

  try {

    await loadSupabase();

    const {
      data: {
        session
      }
    } =
      await db.auth.getSession();


    const isRecovery =
      window.location.hash
        .includes(
          "type=recovery"
        );


    if (isRecovery) {

      $("setup")
        .classList
        .add("hidden");

      $("app")
        .classList
        .add("hidden");

      createResetPasswordUI();

    } else if (session) {

      await afterLogin();

    } else {

      $("setup")
        .classList
        .add("hidden");

      $("app")
        .classList
        .add("hidden");

      createAuthUI();
    }


    db.auth.onAuthStateChange(
      (event, session) => {

        if (
          event ===
          "PASSWORD_RECOVERY"
        ) {

          createResetPasswordUI();

          return;
        }

        if (
          event === "SIGNED_IN" &&
          session &&
          !window.location.hash.includes(
            "type=recovery"
          )
        ) {

          afterLogin();
        }
      }
    );

  } catch (error) {

    console.error(error);

    document.body.insertAdjacentHTML(
      "afterbegin",
      `
      <div style="
        padding:20px;
        margin:20px;
        background:#fee;
        color:#900;
        border:1px solid #d88;
        border-radius:10px;
        font-family:system-ui;
      ">

        <strong>App error:</strong>
        ${esc(error.message)}

      </div>
      `
    );
  }
}

init();
