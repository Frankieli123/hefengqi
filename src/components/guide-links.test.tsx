import { it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as component from "./guide-links";
vi.mock("@/i18n/navigation", () => ({ Link: ({href, locale, children}: {href:string;locale:string;children: React.ReactNode}) => <a href={`/${locale}${href}`}>{children}</a> }));
it("renders short translated cards with crawlable real slugs and no empty section", () => {
 expect(component).toHaveProperty("GuideLinks");
 const { container, rerender } = render(<component.GuideLinks locale="ru" items={[{id:"a",slug:"actual-slug",title:"Название",summary:"Кратко"}]} />);
 expect(screen.getByRole("heading", {level:2}).textContent).toBe("Технические руководства и выбор оборудования");
 expect(screen.getByRole("link").getAttribute("href")).toBe("/ru/news/actual-slug");
 expect(container.textContent).toContain("Кратко");
 rerender(<component.GuideLinks locale="ru" items={[]} />);
 expect(container.innerHTML).toBe("");
});
