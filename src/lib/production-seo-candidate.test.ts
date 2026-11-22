import { expect, it, vi } from 'vitest';
vi.mock('@/i18n/navigation',()=>({Link:()=>null}));
vi.mock('next-intl/server',()=>({getTranslations:async()=> (key:string)=>key,setRequestLocale:vi.fn()}));
vi.mock('@/components/products/catalog',()=>({Catalog:()=>null}));
vi.mock('@/components/json-ld',()=>({JsonLd:()=>null}));
vi.mock('@/lib/content-repository',()=>({getCategories:async()=>[{id:'cat-a',key:'power-a',slug:'power',path:'legacy/power',name:'Legacy Power',description:'legacy'},{id:'cat-b',key:'power',slug:'power',path:'systems/power',name:'Power',description:'power'}],getCategoryAlternatePaths:async()=>({en:'/products/category/systems/power'}),getProductCatalogPage:async()=>({products:[],pageCount:2,currentPage:2,totalCount:30}),getSlugRedirect:async()=>null}));
import Products,{generateMetadata} from '@/app/[locale]/products/page';
import Category,{generateMetadata as categoryMetadata} from '@/app/[locale]/products/category/[...slug]/page';
import { productSchema,localizedMetadata } from '@/lib/seo';
import { locales } from '@/types/domain';
const props=(locale='en',page?:string|string[])=>({params:Promise.resolve({locale}),searchParams:Promise.resolve({page})});
it('page1 keeps seven locale canonicals and share image',async()=>{for(const l of locales){const m=await generateMetadata(props(l,'1'));expect(m.alternates?.canonical).toBe(`https://ricewind.com/${l}/products`);expect(JSON.stringify(localizedMetadata(l,'','unused','unused'))).toContain('ricewind-social-v1.jpg')}});
it('page2 canonical identifies page2, no guessed translated page2',async()=>{const m=await generateMetadata(props('en','2'));expect(m.alternates?.canonical).toBe('https://ricewind.com/en/products?page=2');expect(m.alternates?.languages).not.toHaveProperty('de')});
it('category uses full identity and page2',async()=>{const m=await categoryMetadata({...props('en','2'),params:Promise.resolve({locale:'en',slug:['systems','power']})});expect(m.alternates?.canonical).toBe('https://ricewind.com/en/products/category/systems/power?page=2');const missing=await categoryMetadata({...props(),params:Promise.resolve({locale:'en',slug:['wrong','power']})});expect(missing).toEqual({})});
it('invalid pages reject instead of aliasing page1',async()=>{for(const page of ['0','-1','2junk','1.5',['2'],'9007199254740992']){await expect(generateMetadata(props('en',page))).rejects.toThrow();await expect(Products(props('en',page))).rejects.toThrow();await expect(Category({...props('en',page),params:Promise.resolve({locale:'en',slug:['systems','power']})})).rejects.toThrow()}});
it('RFQ retains Product identity without made up Offer',()=>{const p={name:'Synthetic model',slug:'synthetic',sku:'TEST-SKU',model:'TEST-MODEL',brand:'Huawei',categoryName:'Power',directDefinition:'Synthetic fixture',attributes:[],images:[],updatedAt:'2026-01-01'};const s=productSchema('en',p as never);expect(s['@type']).toBe('Product');expect(s.sku).toBe('TEST-SKU');expect(s.mpn).toBe('TEST-MODEL');expect(s.brand.name).toBe('Huawei');expect(s).not.toHaveProperty('offers')});

it('render resolves duplicate leaf by full path',async()=>{const rendered=await Category({...props('en','2'),params:Promise.resolve({locale:'en',slug:['systems','power']})});expect(rendered).toBeTruthy()});
