import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import fs from "fs";
import path from "path";

// Test that verifies the actual page files have correct button implementations
describe("Admin Page Button Implementation Verification", () => {
  const adminPagesWithAddButton = [
    {
      path: "src/app/admin/roles/page.tsx",
      expectedHref: "/admin/roles/new",
      buttonText: "新增角色",
    },
    {
      path: "src/app/admin/menus/page.tsx",
      expectedHref: "/admin/menus/new",
      buttonText: "新增菜单",
    },
    {
      path: "src/app/admin/configs/page.tsx",
      expectedHref: "/admin/configs/new",
      buttonText: "新增配置",
    },
  ];

  adminPagesWithAddButton.forEach(({ path: filePath, expectedHref, buttonText }) => {
    it(`${filePath} should have Button with asChild and Link to ${expectedHref}`, () => {
      const fullPath = path.resolve(process.cwd(), filePath);
      const content = fs.readFileSync(fullPath, "utf-8");

      // Verify the file imports Link from next/link
      expect(content).toMatch(/import\s+Link\s+from\s+["']next\/link["']/);

      // Verify Button has asChild prop
      expect(content).toMatch(/<Button\s+asChild>/);

      // Verify Link has correct href
      expect(content).toContain(`href="${expectedHref}"`);

      // Verify button text exists
      expect(content).toContain(buttonText);
    });
  });

  // Test that pages WITHOUT add buttons don't have broken button patterns
  const pagesWithoutAddButton = [
    "src/app/admin/users/page.tsx",
  ];

  pagesWithoutAddButton.forEach((filePath) => {
    it(`${filePath} should not have broken standalone Button without Link`, () => {
      const fullPath = path.resolve(process.cwd(), filePath);
      const content = fs.readFileSync(fullPath, "utf-8");

      // These pages should NOT have a standalone <Button> with 新增 text
      // Pattern to detect: <Button> followed by 新增 without asChild
      const brokenPattern = /<Button>[\s\S]*?新增/;
      expect(content).not.toMatch(brokenPattern);
    });
  });
});
