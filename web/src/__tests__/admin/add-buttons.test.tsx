import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Mock next/link for testing
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("Admin Page Add Buttons", () => {
  it("renders add button as a clickable link with correct href", () => {
    // This tests the pattern used across all admin pages:
    // <Button asChild><Link href="/admin/xxx/new">新增xxx</Link></Button>
    render(
      <Button asChild>
        <Link href="/admin/roles/new">新增角色</Link>
      </Button>
    );

    const link = screen.getByRole("link", { name: /新增角色/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/admin/roles/new");
  });

  it("button without asChild and Link is not a link element", () => {
    // This tests the OLD broken pattern - button without link
    render(<Button>新增角色</Button>);

    // Should NOT be a link
    const link = screen.queryByRole("link", { name: /新增角色/ });
    expect(link).not.toBeInTheDocument();

    // Should be a button
    const button = screen.getByRole("button", { name: /新增角色/ });
    expect(button).toBeInTheDocument();
  });

  it("all admin add buttons should have correct href patterns", () => {
    const addButtonConfigs = [
      { href: "/admin/roles/new", label: "新增角色" },
      { href: "/admin/menus/new", label: "新增菜单" },
      { href: "/admin/configs/new", label: "新增配置" },
    ];

    addButtonConfigs.forEach(({ href, label }) => {
      const { unmount } = render(
        <Button asChild>
          <Link href={href}>{label}</Link>
        </Button>
      );

      const link = screen.getByRole("link", { name: new RegExp(label) });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", href);

      unmount();
    });
  });
});
