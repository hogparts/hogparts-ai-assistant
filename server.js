import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json({ limit: "64kb" }));

const PORT = process.env.PORT || 3000;
const SHOP = process.env.SHOPIFY_STORE_DOMAIN || "hogparts.com";
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

const SYSTEM = `You are the Hogparts AI Assistant for Hogparts UK Ltd, an independent UK motorcycle parts retailer specialising in aftermarket Harley-Davidson parts. Hogparts UK Ltd is independent and has no relationship with Harley-Davidson.
Use British English. Never invent product fitment, stock, specifications, prices or delivery information. Treat fitment as confirmed only when the supplied Hogparts catalogue data explicitly supports it. If evidence is insufficient, say that fitment cannot be confirmed and suggest contacting the Hogparts team. Keep answers concise and useful. Do not hard-sell.`;

async function storefront(query, variables = {}) {
  if (!STOREFRONT_TOKEN) throw new Error("Shopify Storefront token not configured");
  const r = await fetch(`https://${SHOP}/api/2026-07/graphql.json`, {
    method: "POST",
    headers: {"Content-Type":"application/json","X-Shopify-Storefront-Access-Token":STOREFRONT_TOKEN},
    body: JSON.stringify({query, variables})
  });
  if (!r.ok) throw new Error(`Shopify request failed: ${r.status}`);
  const j = await r.json();
  if (j.errors) throw new Error(j.errors.map(e=>e.message).join("; "));
  return j.data;
}

async function searchProducts(search) {
  const q = `query Search($q:String!){products(first:8,query:$q){nodes{id handle title vendor productType description featuredImage{url altText} variants(first:5){nodes{id title sku price{amount currencyCode} availableForSale}} fitment:metafield(namespace:"custom",key:"fitment"){value} specifications:metafield(namespace:"custom",key:"specifications"){value}}}}`;
  return (await storefront(q,{q:search})).products.nodes;
}

app.get("/health", (_req,res)=>res.json({ok:true,service:"hogparts-ai-assistant",shop:SHOP,aiConfigured:Boolean(OPENAI_API_KEY),shopifyConfigured:Boolean(STOREFRONT_TOKEN)}));

app.post("/api/search", async (req,res)=>{
  try {
    const q=String(req.body?.q||"").trim();
    if(!q) return res.status(400).json({error:"Search query required"});
    res.json({products:await searchProducts(q)});
  } catch(e){res.status(500).json({error:e.message});}
});

app.post("/api/chat", async (req,res)=>{
  try {
    if(!OPENAI_API_KEY) return res.status(503).json({error:"AI is not configured yet"});
    const message=String(req.body?.message||"").trim();
    if(!message) return res.status(400).json({error:"Message required"});
    let products=[];
    try { products=await searchProducts(message); } catch {}
    const catalogue=products.map(p=>({title:p.title,handle:p.handle,vendor:p.vendor,productType:p.productType,description:p.description,fitment:p.fitment?.value||"",specifications:p.specifications?.value||"",variants:p.variants.nodes.map(v=>({sku:v.sku,title:v.title,price:v.price,availableForSale:v.availableForSale}))}));
    const client=new OpenAI({apiKey:OPENAI_API_KEY});
    const response=await client.responses.create({model:MODEL,instructions:SYSTEM,input:`Customer question: ${message}\n\nRelevant Hogparts catalogue results:\n${JSON.stringify(catalogue)}`});
    res.json({answer:response.output_text,products:products.slice(0,4).map(p=>({title:p.title,handle:p.handle,image:p.featuredImage?.url||null,url:`https://hogparts.com/products/${p.handle}`}))});
  } catch(e){res.status(500).json({error:e.message});}
});

app.get("/",(_req,res)=>res.type("html").send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Hogparts AI Assistant</title><style>body{font:16px Arial,sans-serif;max-width:760px;margin:50px auto;padding:20px;background:#f5f5f5}.box{background:white;padding:24px;border-radius:12px}input{width:75%;padding:12px}button{padding:12px}#out{white-space:pre-wrap;margin-top:20px}</style></head><body><div class="box"><h1>Hogparts AI Assistant</h1><p>Development test interface. Not connected to the live storefront.</p><input id="q" placeholder="Ask about a product or fitment"><button onclick="go()">Ask</button><div id="out"></div></div><script>async function go(){let o=document.getElementById("out");o.textContent="Thinking...";let r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:document.getElementById("q").value})});let j=await r.json();o.textContent=j.answer||j.error||"No response";}</script></body></html>`));

app.listen(PORT,()=>console.log(`Hogparts AI Assistant listening on ${PORT}`));
