function streak() {
  if (!state) return 0;

  const start = parseDate(state.startDate);
  const today = parseDate(todayISO());

  if (today < start) return 0;

  const completedThrough = Math.min(
    100,
    Math.floor((today - start) / 86400000) + 1
  );

  let s = 0;

  for (let i = 0; i < completedThrough; i++) {
    const d = iso(
      new Date(
        start.getTime() + i * 86400000
      )
    );

    const st = status(d);

    if (st === "done" || st === "warn") {
      s++;
    } else {
      break;
    }
  }

  return s;
}
