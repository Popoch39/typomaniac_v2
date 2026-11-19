import { expect, test } from "bun:test";
import { aroundYouCaption } from "../src/features/leaderboard/own/aroundYouCaption.ts";

test("the Around you caption names the Positions it shows", () => {
  expect(aroundYouCaption([{ position: 36 }, { position: 37 }, { position: 38 }])).toBe(
    "Around you · positions 36 to 38",
  );
});

test("with nobody around, the caption is bare", () => {
  expect(aroundYouCaption([])).toBe("Around you");
});
