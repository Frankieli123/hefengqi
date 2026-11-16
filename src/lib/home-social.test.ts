import {it,expect,vi} from "vitest";
vi.mock("@/lib/env",()=>({env:{SITE_URL:"https://ricewind.com"}}));
import {localizedMetadata} from "./seo";
it("returns factual homepage title and own public social image without changing other pages",()=>{
 const m=localizedMetadata("en","","old slogan","old description");
 expect(m.title).toEqual({absolute:"RICEWIND | Telecom Power, Rectifiers & Cooling Equipment"});
 expect(m.openGraph).toMatchObject({title:"RICEWIND | Telecom Power, Rectifiers & Cooling Equipment",images:[{url:"https://ricewind.com/brand/ricewind-social-v1.jpg",width:1200,height:630,alt:expect.any(String)}]});
 expect(m.twitter).toMatchObject({card:"summary_large_image",images:["https://ricewind.com/brand/ricewind-social-v1.jpg"]});
 expect(m.description).toContain("Huawei, Vertiv, Delta, Eltek and ZTE");
 expect(localizedMetadata("en","/news","News","Existing description").description).toBe("Existing description");
});

it("localizes all seven homepage metadata entries",()=>{
 for(const locale of ["en","ru","fr","de","es","ar","zh"] as const){const m=localizedMetadata(locale,"","ignored","ignored");expect(m.description).not.toBe("ignored");expect(m.openGraph).toMatchObject({locale});}
});
