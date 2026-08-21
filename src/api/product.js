/**
 * ============================================================================
 * WiseTrack E-Commerce - Product Catalog API & UI Manager
 * File: src/api/product.js
 * API Endpoint: https://demo.wisetracktechnologies.com/api/catalog
 * ============================================================================
 */

(function (window, document) {
  'use strict';

  // API Configuration
  const API_CONFIG = {
    URL: 'https://demo.wisetracktechnologies.com/api/catalog',
    CACHE_KEY: 'wisetrack_catalog_cache',
    CACHE_TIMESTAMP_KEY: 'wisetrack_catalog_cache_time',
    CACHE_EXPIRY_MS: 30 * 60 * 1000 // 30 minutes
  };

  // Initial Fallback Products (directly from WiseTrack Catalog API)
  const INITIAL_PRODUCTS = ﻿[{"id":"16a8357b-4fa1-40ff-a70c-43094daee1d4","name":"24 Mantra Cold Pressed Organic Groundnut Oil 1 ltr","description":"24 Mantra Cold Pressed Organic Groundnut Oil is a pure, unrefined oil extracted from premium organic peanuts using traditional cold-pressing methods. This 1-liter bottle retains the natural nutrients, rich aroma, and authentic flavor of groundnuts. Free from chemicals, pesticides, and additives, it is ideal for cooking, frying, and dressing. Rich in monounsaturated fats, antioxidants, and vitamin E, it promotes heart health and boosts immunity. Certified organic by USDA and India Organic, it ensures high-quality, sustainable farming practices. Perfect for health-conscious individuals seeking a natural, flavorful cooking oil.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6476/1762760674479.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6476/1762760680437.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6476/1762760711272.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6476/1762760696042.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6476/1762760705638.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6476/1762760724418.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6476/1762760727357.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6476/1762760756872.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6476/1762760734239.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6476/1762760738373.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6476/1762760810192.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6476/1762760530406.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6476/1721112552052.png"],"category":"Edible Oils","unit":"pcs","price":468.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"f2540e1a-5901-42c6-b3a2-735567cc63b2","name":"24 Mantra Organic Bajra Flour 500 gm","description":"24 Mantra Organic Bajra Flour is a 100% organic and nutritious flour made from premium quality bajra (pearl millet). Packed in a 500 gm pack, it is rich in fiber, protein, and essential minerals like iron and magnesium. Free from harmful chemicals, pesticides, and additives, this flour is perfect for making traditional Indian dishes like rotis, bhakris, and porridge. Ideal for health-conscious individuals, it supports digestion, boosts energy, and promotes overall well-being. Certified organic, it ensures purity and sustainability from farm to table.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6453/1758717966167.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6453/1758717971054.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6453/1758717974442.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6453/1758717977812.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6453/1758717981440.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6453/1758717984709.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6453/1758718044691.png"],"category":"Atta, Flours \u0026 Sooji","unit":"pcs","price":68.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"6651c7b0-b9ab-47d7-9e98-26ce532108e9","name":"24 Mantra Organic Broken Rice 1 kg","description":"24 Mantra Organic Broken Rice is a wholesome and nutritious choice for health-conscious individuals. Sourced from certified organic farms, this 1 kg pack ensures you get pure, chemical-free rice. Broken rice, though smaller in size, retains the same nutritional value as whole grains, making it perfect for porridge, khichdi, or traditional dishes. Rich in fiber and essential nutrients, it supports a balanced diet. Free from pesticides and artificial additives, it’s ideal for those seeking organic, sustainable food options. Enjoy the natural goodness and authentic taste of 24 Mantra Organic Broken Rice in your everyday meals.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6422/1730794568525.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6422/1730794571027.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6422/1730794573714.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6422/1730794576634.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6422/1730794601750.png"],"category":"Rice \u0026 Similar Products","unit":"pcs","price":68.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"f3082951-98b3-4afa-8965-056cd5f2e606","name":"24 Mantra Organic Brown Chana 500 gm","description":"24 Mantra Organic Brown Chana (500 gm) is a nutritious and wholesome pulse, grown organically without synthetic pesticides or fertilizers. Rich in protein, fiber, and essential minerals like iron and magnesium, it supports a healthy diet. Ideal for curries, salads, and snacks, these chickpeas are non-GMO and certified organic, ensuring purity and sustainability. Free from harmful chemicals, they promote better digestion and overall well-being. Perfect for health-conscious individuals seeking organic, high-quality ingredients for traditional and modern recipes.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6426/1697433994745.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6426/1697434003072.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6426/1697434006189.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6426/1697434010806.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6426/1697434013968.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6426/1697434016638.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6426/1697434019582.png"],"category":"Dals \u0026 Pulses","unit":"pcs","price":108.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"d0d9b46e-c3de-428a-8130-33272f236f55","name":"24 Mantra Organic Brown Sugar 500 gm","description":"24 Mantra Organic Brown Sugar is a natural sweetener made from organic sugarcane. It is unrefined, retaining essential minerals like iron, calcium, and potassium. Free from chemicals and artificial additives, this 500 gm pack offers a healthier alternative to refined sugar. Its rich, caramel-like flavor enhances beverages, desserts, and baked goods. Certified organic, it ensures purity and sustainability. Ideal for health-conscious consumers seeking a wholesome sweetening option.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6442/1707222618265.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6442/1709791726117.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6442/1709791733515.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6442/1709791740874.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6442/1709791748688.png"],"category":"Salt, Sugar \u0026 Jaggery","unit":"pcs","price":77.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"46ae7afb-6513-4806-965e-b7430c3a5b16","name":"24 Mantra Organic Corn Dhaliya 500 gm","description":"24 Mantra Organic Corn Dhaliya is a wholesome and nutritious product made from 100% organic corn. Packed in a 500 gm pack, it is free from harmful chemicals, pesticides, and artificial additives. Rich in fiber, vitamins, and minerals, this corn dhaliya supports digestive health and provides sustained energy. Ideal for making porridge, upma, or soups, it is a versatile ingredient for healthy meals. Certified organic, it ensures purity and quality, making it a great choice for health-conscious individuals. Enjoy the natural goodness of organic corn with every bite.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6458/1696501661148.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6458/1696501671238.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6458/1696501675228.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6458/1696501678839.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6458/1696501683193.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6458/1696501686983.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6458/1696501689851.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6458/1697434599734.png"],"category":"Breakfast Cereals","unit":"pcs","price":54.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"581e37a0-a3e3-4f2f-bb73-895cbc62a7c5","name":"24 Mantra Organic Creamy Peanut Butter 450 gm","description":"24 Mantra Organic Creamy Peanut Butter (450 gm) is a delicious and healthy spread made from 100% organic peanuts. Free from preservatives, artificial flavors, and added sugars, it offers a rich, creamy texture and natural peanut taste. Perfect for sandwiches, smoothies, or as a dip, it provides a good source of protein and healthy fats. Certified organic, it ensures you enjoy a pure, chemical-free product. Ideal for health-conscious individuals and families looking for a nutritious and tasty addition to their diet.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6473/1697435808095.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6473/1697435827645.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6473/1697435830411.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6473/1697435834335.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6473/1697435837464.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6473/1697435840566.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6473/1697435843523.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6473/1697435846630.png"],"category":"Spreads, Sauces, Ketchup","unit":"pcs","price":180.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"5161ccc6-3c3e-400b-8f74-4fdf0b1c26f1","name":"24 Mantra Organic Fusilli Pasta 400 gm","description":"24 Mantra Organic Fusilli Pasta (400 gm) is made from 100% organic durum wheat, ensuring a wholesome and nutritious meal. Free from artificial additives, preservatives, and harmful chemicals, this pasta is perfect for health-conscious individuals. Its spiral shape holds sauces well, making it ideal for a variety of dishes. Rich in fiber and protein, it supports a balanced diet. Certified organic, it meets stringent quality standards. Enjoy it in salads, soups, or with your favorite sauces for a delicious and organic dining experience.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/7956/1671619836826.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/7956/1671619840632.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/7956/1697435888497.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/7956/1697435892005.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/7956/1697435895190.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/7956/1697435898106.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/7956/1697435901081.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/7956/1697435904168.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/7956/1697435907587.png"],"category":"Noodle, Pasta, Vermicelli","unit":"pcs","price":72.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"b1f60274-859f-4130-8c55-dc809e914d72","name":"24 Mantra Organic Peanut 500 gm","description":"24 Mantra Organic Peanut (500 gm) is a premium, chemical-free snack packed with nutrients. Grown organically without synthetic pesticides or fertilizers, these peanuts are rich in protein, healthy fats, and essential vitamins. They are perfect for snacking, cooking, or adding to desserts. The natural farming process ensures superior taste and quality while promoting sustainable agriculture. Enjoy them roasted, boiled, or as peanut butter for a wholesome, organic treat. Ideal for health-conscious individuals seeking clean, nutritious food options. Certified organic, non-GMO, and free from artificial additives.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6439/1738327321403.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6439/1738327327030.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6439/1738327371306.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6439/1738327375573.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6439/1738327379819.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6439/1738327390230.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6439/1738327395439.png"],"category":"Dry Fruits","unit":"pcs","price":176.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"1dbb4a4c-a051-43bb-9609-c899183db33a","name":"24 Mantra Organic Wild Honey 250 gm","description":"24 Mantra Organic Wild Honey is a pure, natural sweetener sourced from certified organic farms. This 250 gm jar contains unprocessed honey, free from artificial additives and pesticides. Rich in antioxidants and enzymes, it offers numerous health benefits, including boosting immunity and aiding digestion. The honey is carefully extracted to retain its natural flavor and nutritional value. Ideal for daily consumption, it can be used in teas, smoothies, or as a natural sweetener in various dishes. Certified organic, it ensures you enjoy a chemical-free product that supports sustainable farming practices.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6471/1758804183907.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6471/1758804188772.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6471/1758804193238.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6471/1758804198746.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6471/1758804203397.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6471/1758804207218.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6471/1758804211243.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/6471/1758804216369.png"],"category":"Honey \u0026 Jams","unit":"pcs","price":171.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"19945305-bf24-4380-af91-6a24f1782d98","name":"2 In 1 Crazy Slime Diy Kit","description":"","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/17303/1769926778372.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/17303/1769926782811.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/17303/1769926786551.png"],"category":"Toys \u0026 Games","unit":"pcs","price":365.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"50ee4b4f-2fe4-4e7f-bea7-ee110216fc93","name":"4-in-1 Foot Scrubber 1 pc","description":"The 4-in-1 foot scrubber is a versatile tool designed for exfoliating and smoothing rough skin. It features four different textured surfaces to effectively remove dead skin, calluses, and dirt. Made from durable materials, it is easy to clean and long-lasting. Ideal for at-home pedicures, this scrubber helps maintain soft, healthy feet. Compact and lightweight, it’s convenient for travel or daily use. Simply use with water or your favorite cleanser for best results. Perfect for achieving salon-quality foot care in the comfort of your home.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/1189/1760876832307.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/1189/1760876835990.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/1189/1760876841577.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/1189/1760877213718.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/1189/1760877217896.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/1189/1760877225025.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/1189/1760877230272.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/1189/1760877233696.png"],"category":"Bathing Accessories","unit":"pcs","price":65.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"f52715b1-b21f-4023-aaa4-a67e2d513c21","name":"555 Special Washing Soap 900 gm","description":"The 555 Special Washing Soap (900 gm) is a high-quality detergent designed for effective cleaning. It removes tough stains and dirt from clothes, leaving them fresh and fragrant. Suitable for both hand and machine washing, this soap is gentle on fabrics while ensuring deep cleansing. Its powerful formula works in all water conditions, making it ideal for everyday laundry needs. The 900 gm pack offers great value for money, providing long-lasting usage. Perfect for households looking for a reliable and efficient washing solution.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/1505/1730701678495.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/1505/1730701681253.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/1505/1730701684079.png"],"category":"Detergents \u0026 Dishwashes","unit":"pcs","price":90.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"f2ce8310-505e-4ed2-8ddd-4723968cf4ae","name":"777 Appalam Papad 300 gm","description":"777 Appalam Papad 300 gm is a premium quality, crispy and delicious papad made from the finest ingredients. Perfect for frying or roasting, it adds a delightful crunch to any meal. These papads are made using traditional methods to ensure authentic taste and texture. Ideal for snacks, starters, or as a side dish with meals, they are a must-have in every kitchen. The 300 gm pack ensures you have enough to enjoy with family and friends. Enjoy the rich flavor and crispiness of 777 Appalam Papad, a perfect accompaniment to your favorite dishes.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/4461/1700294556533.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/4461/1700294561118.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/4461/1700294565148.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/4461/1700294568760.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/4461/1700294572821.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/4461/1700294576113.png"],"category":"Ready To Cook \u0026 Eat","unit":"pcs","price":128.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"1730885b-3bfa-43b9-a380-b5a46c56b859","name":"777 Madras Sambar Powder 100 gm (pouch)","description":"777 Madras Sambar Powder 100 gm (Pouch) is a premium blend of authentic spices, crafted to deliver the rich and aromatic flavors of traditional South Indian sambar. Made with high-quality ingredients like coriander, red chilies, fenugreek, and turmeric, this spice mix ensures a perfect balance of taste and aroma. Conveniently packed in a 100 gm pouch, it is ideal for quick and easy preparation of delicious sambar at home. Free from artificial additives, it enhances the natural flavors of your dishes. A must-have in every kitchen for those who love authentic South Indian cuisine.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/9173/1731152866407.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/9173/1731152869674.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/9173/1731152872166.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/9173/1731152880523.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/9173/1731152891602.png"],"category":"Masalas \u0026 Spices","unit":"pcs","price":69.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"6ee91851-093e-4cf8-8796-17132123bcec","name":"7 Up Nimbooz Masala Soda 250 ml","description":"7 Up Nimbooz Masala Soda is a refreshing 250 ml carbonated drink infused with tangy lemon and a blend of traditional Indian spices. It offers a unique twist to the classic lemon soda, combining the zesty flavor of nimbooz (Indian lemon) with a hint of masala for an exhilarating taste experience. Perfect for quenching thirst, this beverage is ideal for hot days or as a flavorful accompaniment to meals. Its light, fizzy texture and bold masala kick make it a favorite among those who enjoy a spicy, citrusy soda.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/7935/1707222003413.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/7935/1707222007271.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/7935/1707222010759.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/7935/1707222014534.png"],"category":"Energy \u0026 Soft Drinks","unit":"pcs","price":19.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"0d31ff20-9cda-46c2-a3e6-0da1c84e3846","name":"A4 Sheet 500 pcs","description":"A pack of 500 A4 sheets, perfect for printing, photocopying, and everyday office or school use. These high-quality sheets ensure smooth performance with printers and copiers, providing crisp and clear prints. Ideal for bulk usage, the A4 size (210 x 297 mm) is standard for documents, reports, and presentations. The pack offers great value for money, reducing the need for frequent purchases. Suitable for both home and professional settings, these sheets are compatible with inkjet and laser printers. Durable and reliable, they help maintain productivity without compromising on quality.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2442/1782558029224.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2442/1782557978390.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2442/1782557980890.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2442/1782558278977.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2442/1782558285822.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2442/1782558343381.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2442/1782558354661.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2442/1782558149582.jpg","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2442/1782558150911.jpg","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2442/1782558480328.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2442/1736418916124.png"],"category":"School \u0026 Office Supplies","unit":"pcs","price":199.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"0fd622d8-9547-4957-bcb3-71fdd1fc226d","name":"Aashirvaad Mango Lassi 160 ml","description":"Aashirvaad Mango Lassi 160 ml","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/17488/1775619752599.jpg","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/17488/1775619761678.jpg","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/17488/1775619769455.jpg","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/17488/1775619810005.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/17488/1775619819922.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/17488/1775619834968.jpg","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/17488/1775619844439.jpg","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/17488/1775619880082.jpg","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/17488/1775891639514.jpg","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/17488/1775889534360.jpg","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/17488/1775891824948.jpg","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/17488/1775620069600.jpg","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/17488/1775620078826.jpg","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/17488/1775620013556.png"],"category":"Dairy \u0026 Yoghurt","unit":"pcs","price":19.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"c9170fbb-fd52-4221-bc66-dad006193134","name":"Aashirvaad Svasti Pure Cow Ghee 1 ltr","description":"Aashirvaad Svasti Pure Cow Ghee is a 1-litre pack of traditional, clarified butter made from pure cow\u0027s milk. It is rich in aroma and flavor, enhancing the taste of your meals. This ghee is prepared using the traditional bilona method, ensuring high quality and purity. It is free from additives and preservatives, making it a healthy choice for cooking, frying, or adding to desserts. Rich in essential nutrients, it supports digestion and boosts immunity. Ideal for daily use in Indian households, it is perfect for traditional dishes, sweets, and even as a topping on rotis and rice.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2154/1673167113590.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2154/1673167119445.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2154/1731498961602.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2154/1731498966089.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2154/1731498969851.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2154/1731498972136.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/2154/1731498975681.png"],"category":"Ghee","unit":"pcs","price":795.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false},{"id":"c2cc0a55-30dc-48db-9e22-5aca9bcc5f00","name":"Absorbent Cotton 30 gm","description":"Absorbent Cotton 30 gm is a high-quality, sterile, and soft cotton wool widely used for medical and cosmetic purposes. It is highly absorbent, making it ideal for wound dressing, applying antiseptics, and removing makeup. The cotton is free from impurities and ensures gentle care for sensitive skin. Its lightweight 30 gm packaging makes it convenient for home and professional use. Suitable for first aid kits, hospitals, and beauty routines, this cotton is hypoallergenic and safe for all skin types. It provides excellent absorption and softness, ensuring comfort and hygiene in various applications.","imageUrls":["https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/3087/1668154210250.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/3087/1740395900557.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/3087/1740395907181.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/3087/1740395912297.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/3087/1740395917365.png","https://pub-07ca69b002054d93ab7b5ce114937053.r2.dev/product/3087/1740395923271.png"],"category":"Health \u0026 Medicine","unit":"pcs","price":40.0000,"mrp":null,"taxNote":"incl. GST","availability":"in_stock","qtyHint":null,"featured":false,"variantGroupId":null,"variantCount":0,"isDigital":false}]
;

  /**
   * Product Catalog Service & UI Controller
   */
  const ProductAPI = {
    url: API_CONFIG.URL,
    products: INITIAL_PRODUCTS,
    isLoaded: false,
    isLoading: false,

    async init() {
      // 1. Load from cache first for instant render
      this.loadFromCache();

      // 2. Render UI immediately with cached/initial products
      this.renderAll();

      // 3. Listen for Category & popstate events
      window.addEventListener('categories-updated', () => this.renderAll());
      window.addEventListener('popstate', () => this.renderAll());

      // 4. Fetch fresh catalog from API
      await this.fetchCatalog();
    },

    loadFromCache() {
      try {
        const cached = localStorage.getItem(API_CONFIG.CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.products = parsed;
          }
        }
      } catch (err) {
        console.warn('[ProductAPI] Error loading cache:', err);
      }
    },

    async fetchCatalog() {
      if (this.isLoading) return;
      this.isLoading = true;

      try {
        const response = await fetch(this.url);
        if (!response.ok) throw new Error('HTTP error ' + response.status);

        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          this.products = data;
          this.isLoaded = true;

          try {
            const cacheSubset = data.slice(0, 300);
            localStorage.setItem(API_CONFIG.CACHE_KEY, JSON.stringify(cacheSubset));
            localStorage.setItem(API_CONFIG.CACHE_TIMESTAMP_KEY, Date.now().toString());
          } catch (e) {}

          this.renderAll();

          window.dispatchEvent(new CustomEvent('catalog:loaded', { detail: data }));
          window.dispatchEvent(new CustomEvent('catalog-loaded', { detail: data }));

          if (window.Alpine && window.Alpine.store) {
            const prodStore = window.Alpine.store('products');
            if (prodStore) prodStore.items = data;
          }

          return data;
        }
      } catch (error) {
        console.warn('[ProductAPI] Live Catalog fetch warning (using fallback data):', error);
      } finally {
        this.isLoading = false;
      }

      return this.products;
    },

    getProducts(options) {
      options = options || {};
      let list = [...this.products];
      const category = options.category;
      const search = options.search;
      const minPrice = options.minPrice;
      const maxPrice = options.maxPrice;
      const sort = options.sort;
      const limit = options.limit;
      const offset = options.offset;

      if (category && category !== 'all' && category !== 'All' && category !== '*') {
        const catNorm = category.toLowerCase().trim();
        list = list.filter(p => p.category && p.category.toLowerCase().trim() === catNorm);
      }

      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        list = list.filter(p => 
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
        );
      }

      if (typeof minPrice === 'number') {
        list = list.filter(p => (p.price || 0) >= minPrice);
      }

      if (typeof maxPrice === 'number' && maxPrice > 0) {
        list = list.filter(p => (p.price || 0) <= maxPrice);
      }

      if (sort) {
        if (sort === 'price-low' || sort === 'Price: Low to High') {
          list.sort((a, b) => (a.price || 0) - (b.price || 0));
        } else if (sort === 'price-high' || sort === 'Price: High to Low') {
          list.sort((a, b) => (b.price || 0) - (a.price || 0));
        } else if (sort === 'name' || sort === 'Name A-Z') {
          list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
      }

      const start = offset || 0;
      if (typeof limit === 'number' && limit > 0) {
        return list.slice(start, start + limit);
      }

      return list;
    },

    getProductById(id) {
      if (!id) return this.products[0] || null;
      return this.products.find(p => p.id === id || String(p.id) === String(id)) || this.products[0] || null;
    },

    getImageUrl(product) {
      if (product && Array.isArray(product.imageUrls) && product.imageUrls.length > 0 && product.imageUrls[0]) {
        return product.imageUrls[0];
      }
      return 'src/images/home-1/best-selling-tabs/product-1.webp';
    },

    formatPrice(amount) {
      if (typeof amount !== 'number' || isNaN(amount)) amount = 0;
      return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    },

    /**
     * Generate Grid Product Card HTML
     */
    generateProductCardHtml(product, isSlide) {
      if (isSlide === undefined) isSlide = true;
      if (!product) return '';
      const id = product.id;
      const name = product.name || 'Product';
      const category = product.category || 'General';
      const price = this.formatPrice(product.price || 0);
      const mrp = product.mrp && product.mrp > product.price ? this.formatPrice(product.mrp) : '';
      const img = this.getImageUrl(product);
      const unit = product.unit ? ('<span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">' + product.unit + '</span>') : '';
      const taxNote = product.taxNote ? ('<span class="text-[11px] text-gray-400">' + product.taxNote + '</span>') : '';
      const categoryClass = 'cat-' + category.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const discount = product.mrp && product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 15;

      const slideClass = isSlide ? ('swiper-slide ' + categoryClass) : categoryClass;

      return '<article class="' + slideClass + '">' +
        '<div class="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3.5 sm:p-4 transition-all duration-300 hover:shadow-lg hover:border-primary-main group h-full justify-between">' +
          '<div>' +
            '<div class="relative overflow-hidden rounded-lg bg-gray-50 flex items-center justify-center h-48">' +
              '<a href="product-details-6.html?id=' + id + '" class="relative block w-full h-full flex items-center justify-center p-2">' +
                '<img src="' + img + '" alt="' + name + '" loading="lazy" class="max-h-40 max-w-full object-contain transition-transform duration-300 group-hover:scale-105" onerror="this.onerror=null;this.src=\'src/images/home-1/best-selling-tabs/product-1.webp\';" />' +
              '</a>' +
              '<div class="absolute top-2 left-2 z-10 flex items-center gap-1">' +
                '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500 text-white shadow-sm">' + discount + '% OFF</span>' +
              '</div>' +
              '<div class="absolute top-2 right-2 z-10 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">' +
                '<button type="button" onclick="window.ProductAPI.toggleWishlist(\'' + id + '\')" title="Add to Wishlist" class="flex size-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-md hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer">' +
                  '<svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>' +
                '</button>' +
                '<button type="button" onclick="window.ProductAPI.openQuickView(\'' + id + '\')" title="Quick View" class="flex size-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-md hover:bg-primary-main hover:text-white transition-colors cursor-pointer">' +
                  '<svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>' +
                '</button>' +
              '</div>' +
            '</div>' +
            '<div class="flex items-center justify-between gap-2 pt-2">' +
              '<span class="text-xs font-medium text-primary-main truncate">' + category + '</span>' +
              unit +
            '</div>' +
            '<h3 class="text-gray-900 hover:text-primary-main line-clamp-2 text-sm sm:text-base font-medium leading-snug min-h-[2.5rem] mt-1">' +
              '<a href="product-details-6.html?id=' + id + '">' + name + '</a>' +
            '</h3>' +
            '<div class="flex items-center gap-1 text-amber-400 text-xs mt-1">' +
              '<span>★★★★★</span>' +
              '<span class="text-gray-400 text-xs">(4.8)</span>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<div class="flex items-baseline justify-between gap-2 mb-3">' +
              '<div class="flex items-baseline gap-2">' +
                '<span class="text-gray-900 text-base sm:text-lg font-bold">' + price + '</span>' +
                (mrp ? ('<span class="text-gray-400 text-xs sm:text-sm line-through">' + mrp + '</span>') : '') +
              '</div>' +
              taxNote +
            '</div>' +
            '<button type="button" onclick="window.ProductAPI.addToCart(\'' + id + '\')" class="bg-primary-main hover:bg-primary-main-dark text-white flex w-full items-center justify-center gap-2 rounded-lg py-2.5 px-4 text-sm font-semibold transition-all duration-300 shadow-sm active:scale-95 cursor-pointer">' +
              '<svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>' +
              '<span>Add to Cart</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    },

    /**
     * Generate List Product Card HTML (for shop list view)
     */
    generateProductListCardHtml(product) {
      if (!product) return '';
      const id = product.id;
      const name = product.name || 'Product';
      const category = product.category || 'General';
      const desc = product.description ? product.description.slice(0, 140) + '...' : 'Premium quality item from WiseTrack catalog.';
      const price = this.formatPrice(product.price || 0);
      const mrp = product.mrp && product.mrp > product.price ? this.formatPrice(product.mrp) : '';
      const img = this.getImageUrl(product);
      const unit = product.unit ? ('<span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">' + product.unit + '</span>') : '';
      const discount = product.mrp && product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 15;

      return '<article class="flex flex-col sm:flex-row gap-5 rounded-xl border border-gray-200 bg-white p-4 transition-all duration-300 hover:shadow-lg hover:border-primary-main group items-center justify-between">' +
        '<div class="flex flex-col sm:flex-row gap-4 items-center flex-1 min-w-0 w-full">' +
          '<div class="relative overflow-hidden rounded-xl bg-gray-50 flex items-center justify-center size-36 shrink-0 p-2">' +
            '<a href="product-details-6.html?id=' + id + '" class="block size-full flex items-center justify-center">' +
              '<img src="' + img + '" alt="' + name + '" loading="lazy" class="max-h-28 max-w-full object-contain transition-transform duration-300 group-hover:scale-105" onerror="this.onerror=null;this.src=\'src/images/home-1/best-selling-tabs/product-1.webp\';" />' +
            '</a>' +
            '<span class="absolute top-1.5 left-1.5 text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">' + discount + '% OFF</span>' +
          '</div>' +
          '<div class="flex flex-col justify-between flex-1 min-w-0 space-y-1.5">' +
            '<div class="flex items-center gap-2">' +
              '<span class="text-xs font-semibold text-primary-main">' + category + '</span>' +
              unit +
            '</div>' +
            '<h3 class="text-base sm:text-lg font-semibold text-gray-900 hover:text-primary-main line-clamp-2 leading-snug">' +
              '<a href="product-details-6.html?id=' + id + '">' + name + '</a>' +
            '</h3>' +
            '<p class="text-xs text-gray-500 line-clamp-2">' + desc + '</p>' +
            '<div class="flex items-center gap-1 text-amber-400 text-xs">' +
              '<span>★★★★★</span>' +
              '<span class="text-gray-400 text-xs">(4.8 / 5)</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 sm:pl-4 sm:border-l border-gray-100 shrink-0">' +
          '<div class="flex flex-col sm:items-end">' +
            '<span class="text-xl font-bold text-gray-900">' + price + '</span>' +
            (mrp ? ('<span class="text-xs text-gray-400 line-through">' + mrp + '</span>') : '') +
          '</div>' +
          '<div class="flex items-center gap-2">' +
            '<button type="button" onclick="window.ProductAPI.toggleWishlist(\'' + id + '\')" class="flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:text-red-500 hover:border-red-500 transition-colors">' +
              '<svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>' +
            '</button>' +
            '<button type="button" onclick="window.ProductAPI.addToCart(\'' + id + '\')" class="bg-primary-main hover:bg-primary-main-dark text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm active:scale-95">' +
              '<svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>' +
              '<span>Add to Cart</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    },

    renderAll() {
      this.renderBestSellingTabs();
      this.renderNewArrivals();
      this.renderListingProducts();
      this.renderRelatedProducts();
      this.renderTopRated();
      this.renderProductDetailsPage();
      this.renderHeaderLiveSearch();
    },

    renderBestSellingTabs() {
      const containers = document.querySelectorAll('#best-selling-isotope-grid, .best-selling-tab-slider .swiper-wrapper, .best-selling-product-slider .swiper-wrapper');
      containers.forEach(container => {
        const products = this.getProducts({ limit: 16 });
        if (products.length === 0) return;

        let html = '';
        products.forEach(p => {
          html += this.generateProductCardHtml(p, true);
        });
        container.innerHTML = html;

        const slider = container.closest('.swiper');
        if (slider && slider.swiper) {
          slider.swiper.update();
        }
      });
    },

    renderNewArrivals() {
      const containers = document.querySelectorAll('.new-item-product-slider .swiper-wrapper');
      containers.forEach(container => {
        const products = this.getProducts({ limit: 12, offset: 6 });
        if (products.length === 0) return;

        let html = '';
        products.forEach(p => {
          html += this.generateProductCardHtml(p, true);
        });
        container.innerHTML = html;

        const slider = container.closest('.swiper');
        if (slider && slider.swiper) {
          slider.swiper.update();
        }
      });
    },

    renderListingProducts() {
      const urlParams = new URLSearchParams(window.location.search);
      const activeCategory = urlParams.get('category') || '';
      const searchQuery = urlParams.get('search') || '';

      // Grid View
      const gridContainers = document.querySelectorAll('#product-grid-container, .product-listing-grid, div[x-show*="grid"] .grid');
      const products = this.getProducts({
        category: activeCategory,
        search: searchQuery,
        limit: 36
      });

      gridContainers.forEach(container => {
        if (products.length === 0) {
          container.innerHTML = '<div class="col-span-full py-16 text-center">' +
            '<div class="inline-flex size-16 items-center justify-center rounded-full bg-gray-100 text-gray-400 mb-4">' +
              '<svg class="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>' +
            '</div>' +
            '<h3 class="text-lg font-bold text-gray-800">No products found</h3>' +
            '<p class="text-sm text-gray-500 mt-1">Try selecting another category or clearing search filters.</p>' +
          '</div>';
          return;
        }

        let html = '';
        products.forEach(p => {
          html += this.generateProductCardHtml(p, false);
        });
        container.innerHTML = html;
      });

      // List View
      const listContainers = document.querySelectorAll('#product-list-container, div[x-show*="list"] .space-y-6');
      listContainers.forEach(container => {
        if (products.length === 0) return;
        let html = '';
        products.forEach(p => {
          html += this.generateProductListCardHtml(p);
        });
        container.innerHTML = html;
      });
    },

    renderRelatedProducts() {
      const containers = document.querySelectorAll('.related-product-slider .swiper-wrapper');
      containers.forEach(container => {
        const products = this.getProducts({ limit: 8, offset: 4 });
        if (products.length === 0) return;

        let html = '';
        products.forEach(p => {
          html += this.generateProductCardHtml(p, true);
        });
        container.innerHTML = html;

        const slider = container.closest('.swiper');
        if (slider && slider.swiper) {
          slider.swiper.update();
        }
      });
    },

    renderTopRated() {
      const topRatedContainers = document.querySelectorAll('.top-rated-slider .swiper-wrapper, .top-items-slider .swiper-wrapper');
      topRatedContainers.forEach(container => {
        const products = this.getProducts({ limit: 6, offset: 8 });
        if (products.length === 0) return;

        let html = '';
        products.forEach(p => {
          html += this.generateProductCardHtml(p, true);
        });
        container.innerHTML = html;

        const slider = container.closest('.swiper');
        if (slider && slider.swiper) {
          slider.swiper.update();
        }
      });
    },

    renderProductDetailsPage() {
      if (!window.location.pathname.includes('product-detail')) return;

      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get('id');
      const product = this.getProductById(id);
      if (!product) return;

      document.title = product.name + ' - WiseTrack E-Commerce';

      document.querySelectorAll('h1, h2.product-title').forEach(el => {
        if (el.closest('main') || el.classList.contains('product-title')) {
          el.textContent = product.name;
        }
      });

      document.querySelectorAll('.product-price, .price-display').forEach(el => {
        el.textContent = this.formatPrice(product.price || 0);
      });

      document.querySelectorAll('.product-description, #description').forEach(el => {
        if (product.description) el.textContent = product.description;
      });

      const img = this.getImageUrl(product);
      document.querySelectorAll('.main-product-img, .details-8-main-slider img, img[alt="product"]').forEach(el => {
        el.src = img;
      });
    },

    renderHeaderLiveSearch() {
      const searchInputs = document.querySelectorAll('input[placeholder*="Search for the items"]');
      searchInputs.forEach(input => {
        input.addEventListener('input', (e) => {
          const val = e.target.value.toLowerCase().trim();
          const dropdown = input.closest('[x-data]') ? input.closest('[x-data]').querySelector('.search-dropdown-scrollbar, [x-show="showDropdown"]') : null;
          if (!dropdown) return;

          let resultsContainer = dropdown.querySelector('.search-live-results');
          if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.className = 'search-live-results border-t border-gray-100 pt-3 mt-3';
            dropdown.appendChild(resultsContainer);
          }

          if (val.length < 2) {
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'none';
            return;
          }

          resultsContainer.style.display = 'block';
          const matches = this.getProducts({ search: val, limit: 5 });

          if (matches.length === 0) {
            resultsContainer.innerHTML = '<p class="text-xs text-gray-500 py-2">No matching products found.</p>';
            return;
          }

          let html = '<span class="text-gray-primary text-xs font-semibold uppercase tracking-wider block mb-2">Matching Products</span><div class="space-y-2">';
          matches.forEach(p => {
            const pImg = this.getImageUrl(p);
            const pPrice = this.formatPrice(p.price || 0);
            html += '<a href="product-details-6.html?id=' + p.id + '" class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">' +
              '<img src="' + pImg + '" class="size-10 object-contain rounded bg-white border border-gray-100" />' +
              '<div class="flex-1 min-w-0">' +
                '<h4 class="text-sm font-medium text-gray-800 truncate">' + p.name + '</h4>' +
                '<span class="text-xs text-gray-400">' + p.category + '</span>' +
              '</div>' +
              '<span class="text-sm font-bold text-primary-main">' + pPrice + '</span>' +
            '</a>';
          });
          html += '</div>';
          resultsContainer.innerHTML = html;
        });
      });
    },

    addToCart(productId, qty) {
      qty = qty || 1;
      const product = this.getProductById(productId);
      if (!product) return;

      let cart = [];
      try {
        cart = JSON.parse(localStorage.getItem('wisetrack_cart') || '[]');
      } catch (e) {}

      const existingIndex = cart.findIndex(item => item.id === productId);
      if (existingIndex > -1) {
        cart[existingIndex].qty = (cart[existingIndex].qty || 1) + qty;
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          image: this.getImageUrl(product),
          unit: product.unit,
          qty: qty
        });
      }

      localStorage.setItem('wisetrack_cart', JSON.stringify(cart));
      window.dispatchEvent(new CustomEvent('cart:updated', { detail: cart }));
      this.showToast('Added "' + product.name + '" to cart!');
    },

    toggleWishlist(productId) {
      const product = this.getProductById(productId);
      if (!product) return;

      let wishlist = [];
      try {
        wishlist = JSON.parse(localStorage.getItem('wisetrack_wishlist') || '[]');
      } catch (e) {}

      const idx = wishlist.indexOf(productId);
      if (idx > -1) {
        wishlist.splice(idx, 1);
        this.showToast('Removed from wishlist.');
      } else {
        wishlist.push(productId);
        this.showToast('Added "' + product.name + '" to wishlist!');
      }

      localStorage.setItem('wisetrack_wishlist', JSON.stringify(wishlist));
      window.dispatchEvent(new CustomEvent('wishlist:updated', { detail: wishlist }));
    },

    openQuickView(productId) {
      const product = this.getProductById(productId);
      if (!product) return;
      window.dispatchEvent(new CustomEvent('open-quick-view', { detail: product }));
    },

    showToast(message) {
      let toast = document.getElementById('wisetrack-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'wisetrack-toast';
        toast.className = 'fixed bottom-5 right-5 z-[99999] bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all duration-300 translate-y-20 opacity-0 flex items-center gap-2';
        document.body.appendChild(toast);
      }

      toast.innerHTML = '<svg class="size-5 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>' +
        '<span>' + message + '</span>';
      toast.classList.remove('translate-y-20', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');

      setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
        toast.classList.remove('translate-y-0', 'opacity-100');
      }, 3000);
    }
  };

  window.ProductAPI = ProductAPI;
  window.WiseTrackCatalog = ProductAPI;

  document.addEventListener('alpine:init', () => {
    if (window.Alpine && window.Alpine.store) {
      window.Alpine.store('products', {
        items: ProductAPI.products,
        current: null
      });
      window.Alpine.store('cart', {
        items: JSON.parse(localStorage.getItem('wisetrack_cart') || '[]'),
        get count() {
          return this.items.reduce((acc, item) => acc + (item.qty || 1), 0);
        }
      });
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ProductAPI.init());
  } else {
    ProductAPI.init();
  }

})(window, document);
