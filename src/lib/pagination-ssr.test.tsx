import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
vi.mock('next-intl/server',()=>({getTranslations:async()=> (key:string)=>key,setRequestLocale:vi.fn()}));
vi.mock('@/i18n/navigation',()=>({Link:({href,locale='en',children,prefetch,scroll,...props}: {href:string;locale?:string;children:React.ReactNode;prefetch?:boolean;scroll?:boolean})=><a {...props} href={`/${locale}${href}`} data-prefetch={String(prefetch)} data-scroll={String(scroll)}>{children}</a>}));
vi.mock('@/components/products/category-tree',()=>({CategoryTree:()=>null}));
vi.mock('@/components/products/product-card',()=>({ProductCard:({product}:{product:{name:string}})=><span>{product.name}</span>}));
vi.mock('@/lib/content-repository',()=>({
 getCategories:async()=>[{id:'a',key:'a',slug:'power',path:'legacy/power',name:'Legacy',description:'legacy'},{id:'b',key:'b',slug:'power',path:'systems/power',name:'Chosen',description:'chosen'}],
 getCategoryAlternatePaths:async()=>({en:'/products/category/systems/power'}),getSlugRedirect:async()=>null,
 getProductCatalogPage:async(_locale:string,{page}:{page:number})=>{const items=Array.from({length:30},(_,i)=>({id:`fixture-${i}`,name:`SYNTHETIC-${i}`}));return {products:items.slice((page-1)*24,page*24),currentPage:page,pageCount:2,totalCount:items.length};}
}));
import Products,{generateMetadata} from '@/app/[locale]/products/page';
import Category,{generateMetadata as categoryMetadata} from '@/app/[locale]/products/category/[...slug]/page';
import { locales } from '@/types/domain';
const props=(locale:string,page?:string|string[])=>({params:Promise.resolve({locale,slug:['systems','power']}),searchParams:Promise.resolve({page})});
it('synthetic thirty items: real list/category SSR and metadata for all seven locales',async()=>{
 for(const locale of locales) for(const [Page,metadata,path] of [[Products,generateMetadata,'/products'],[Category,categoryMetadata,'/products/category/systems/power']] as const){
  const m=await metadata(props(locale,'2'));
  expect(m.alternates?.canonical).toBe(`https://ricewind.com/${locale}${path}?page=2`);
  expect(Object.keys(m.alternates?.languages??{}).filter((key)=>key!=="x-default")).toEqual([locale]);
  const html=renderToStaticMarkup(await Page(props(locale,'2')));
  expect(html).toContain('SYNTHETIC-24');expect(html).not.toContain('SYNTHETIC-0<');
  expect(html).toContain(`href="/${locale}${path}?page=2"`);
  expect(html).toContain(`href="/${locale}${path}"`);expect(html).not.toContain('page=1');
  expect(html).toContain('data-prefetch="true"');expect(html).toContain('data-scroll="false"');
  if(Page===Category){expect(html).toContain('Chosen');expect(html).not.toContain('>Legacy<');}
  const first=await metadata(props(locale,'1'));expect(first.alternates?.canonical).toBe(`https://ricewind.com/${locale}${path}`);
  for(const bad of ['0','2junk','3',['2']]) await expect(Page(props(locale,bad))).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
 }
});
