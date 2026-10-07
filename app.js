function streak() {
  function streak() {
  if (!state) return 0;

  const start = parseDate(state.startDate);
  const today = parseDate(todayISO());

  if (today < start) return 0;

  const todayIndex = Math.min(
    100,
    Math.floor((today - start) / 86400000)
  );

  let s = 0;

  // Count completed days before today.
  for (let i = 0; i < todayIndex; i++) {
    const d = iso(
      new Date(
        start.getTime() + i * 86400000
      )
    );

    const st = status(d);

    if (st === "done" || st === "warn") {
      s++;
    } else {
      s = 0;
    }
  }

  // Count today only if it has actually been completed.
  const todayDate = iso(today);
  const todayStatus = status(todayDate);

  if (todayStatus === "done" || todayStatus === "warn") {
    s++;
  }

  return s;
}
}
