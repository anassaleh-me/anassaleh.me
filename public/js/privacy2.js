// Privacy page: the shared shell (nav, footer, reveals) around plain text written in the page itself.
import { shell } from "/js/shell2.js";

const { reveal } = await shell({ current: "" });
reveal();
