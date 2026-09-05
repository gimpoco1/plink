import { translate } from "../i18n/translate";

const SUPPORT_EMAIL = "support@plinkscore.com";

export const FEEDBACK_EMAIL_URL = `mailto:${SUPPORT_EMAIL}?subject=Plink%20feedback`;

export function getReportAProblemEmailUrl() {
  const body = [
    translate("copy.whatHappened"),
    translate("copy.whatDidYouExpectInstead"),
    translate("copy.stepsToReproduce"),
    translate("copy.deviceOrBrowser"),
  ].join("\n\n");

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    translate("copy.plinkProblem"),
  )}&body=${encodeURIComponent(body)}`;
}
