import React, { useState } from "react";
import { Sparkles, Bot, Utensils, Flame, Leaf, Clock, ArrowRight, Heart, Check, RefreshCw } from "lucide-react";

export default function ChefAiTasteMatcher({ onSelectDish, onExploreMenu }) {
  const [selectedMood, setSelectedMood] = useState("cheesy");
  const [customQuery, setCustomQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const moodPresets = [
    {
      id: "cheesy",
      label: "🧀 Cheesy & Comforting",
      headline: "Artisan Truffle & Mozzarella Pairing",
      dish: "Wood-Fired Truffle Margherita",
      subDish: "Garlic Butter Parmesan Pull-Apart",
      price: 520,
      calories: "680 kcal",
      prepTime: "12 mins",
      matchScore: "99%",
      spiceLevel: "Mild 🫑",
      chefNote: "Fresh Buffalo Mozzarella stretched daily, baked at 450°C with Italian black truffle oil and San Marzano tomato sauce.",
      image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&auto=format&fit=crop&q=80"
    },
    {
      id: "spicy",
      label: "🌶️ Spicy & Bold",
      headline: "Fiery Szechuan & Smoked Chili Crunch",
      dish: "Crispy Peri-Peri Glazed Wings",
      subDish: "Charred Jalapeno Popper Dip",
      price: 460,
      calories: "540 kcal",
      prepTime: "10 mins",
      matchScore: "96%",
      spiceLevel: "Fiery 🌶️🌶️🌶️",
      chefNote: "Double-crunch hand-tossed chicken wings tossed in 24-hr fermented peri-peri reduction with roasted garlic lime mayo.",
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80"
    },
    {
      id: "healthy",
      label: "🥗 Clean & Protein-Rich",
      headline: "Mediterranean Harvest Power Plate",
      dish: "Grilled Citrus Herb Chicken Bowl",
      subDish: "Avocado Quinoa & Pomegranate Toss",
      price: 490,
      calories: "410 kcal",
      prepTime: "8 mins",
      matchScore: "98%",
      spiceLevel: "Zesty 🍋",
      chefNote: "Free-range breast marinated with rosemary and cold-pressed olive oil, served over tri-color quinoa and organic baby greens.",
      image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80"
    },
    {
      id: "pairing",
      label: "🍹 Refreshing Sip & Bite",
      headline: "Golden Hour Mocktail & Starter Duo",
      dish: "Passion Fruit Mint Fizz Mocktail",
      subDish: "Crispy Golden Halloumi Fries",
      price: 390,
      calories: "320 kcal",
      prepTime: "6 mins",
      matchScore: "97%",
      spiceLevel: "Sweet & Tangy 🥭",
      chefNote: "Fresh passion fruit pulp shaken with crushed mint leaves, ginger ale, and a hint of Himalayan pink salt.",
      image: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80"
    },
    {
      id: "dessert",
      label: "🍫 Sweet Tooth Finale",
      headline: "Belgian Dark Chocolate Decadence",
      dish: "Warm Molten Lava Soufflé Cake",
      subDish: "Bourbon Vanilla Bean Gelato",
      price: 360,
      calories: "490 kcal",
      prepTime: "9 mins",
      matchScore: "100%",
      spiceLevel: "Sweet Indulgence 🍓",
      chefNote: "70% Single-origin Callebaut Belgian dark chocolate molten core topped with Madagascar vanilla and fresh berries.",
      image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80"
    }
  ];

  const currentSelection = aiResult || moodPresets.find(m => m.id === selectedMood) || moodPresets[0];

  const handleSelectMood = (preset) => {
    setIsAnalyzing(true);
    setSelectedMood(preset.id);
    setAiResult(null);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 350);
  };

  const handleCustomAiSearch = (e) => {
    e.preventDefault();
    if (!customQuery.trim()) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAiResult({
        id: "custom",
        label: "✨ Tailored AI Recommendation",
        headline: `Chef AI Match for: "${customQuery}"`,
        dish: "Chef's Signature Gourmet Platter",
        subDish: "House Infused Herb Focaccia",
        price: 580,
        calories: "510 kcal",
        prepTime: "11 mins",
        matchScore: "98% AI Match",
        spiceLevel: "Balanced 🌿",
        chefNote: `Based on your request "${customQuery}", our AI kitchen pairing engine selected this perfectly balanced culinary combination.`,
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80"
      });
    }, 600);
  };

  return (
    <div className="bg-gradient-to-br from-amber-500/10 via-white to-amber-500/5 rounded-3xl border border-amber-200/90 p-6 md:p-8 shadow-xl shadow-amber-500/5 relative overflow-hidden">
      {/* Decorative culinary glow & background accents */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-400/20 to-orange-400/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-gradient-to-tr from-emerald-400/15 to-transparent rounded-full blur-2xl pointer-events-none -ml-16 -mb-16" />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin-slow" />
            <span>Interactive Chef AI Sommelier</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            What Are You Craving Today? Let Chef AI Recommend
          </h3>
          <p className="text-xs md:text-sm text-slate-600 mt-0.5">
            Tap a flavor craving or ask Chef AI for an instant personalized food &amp; drink pairing.
          </p>
        </div>

        {/* Quick Prompt Input */}
        <form onSubmit={handleCustomAiSearch} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="e.g. light dinner with iced tea..."
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 rounded-2xl px-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
            <Bot className="w-4 h-4 text-amber-500 absolute right-3.5 top-3 pointer-events-none" />
          </div>
          <button
            type="submit"
            disabled={isAnalyzing}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-slate-900/10 flex-shrink-0"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Ask AI</span>
          </button>
        </form>
      </div>

      {/* Mood Selector Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none relative z-10 mb-6">
        {moodPresets.map((preset) => {
          const isActive = selectedMood === preset.id && !aiResult;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelectMood(preset)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                isActive
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 scale-102 font-black"
                  : "bg-white text-slate-700 hover:bg-amber-50/60 border border-slate-200/90"
              }`}
            >
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive AI Recommendation Card */}
      <div className="relative z-10 bg-white rounded-3xl border border-slate-200/90 p-5 md:p-6 shadow-md shadow-slate-100 flex flex-col lg:flex-row gap-6 items-center">
        {/* Left: Dish Preview Image with Floating Food Badges */}
        <div className="relative w-full lg:w-72 h-52 lg:h-56 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg group">
          <img
            src={currentSelection.image}
            alt={currentSelection.dish}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
          
          {/* Top Floating Match Badge */}
          <div className="absolute top-3 left-3 bg-amber-500 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-slate-950" />
            <span>{currentSelection.matchScore} TASTE MATCH</span>
          </div>

          {/* Bottom Floating Prep Time */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[11px] font-bold">
            <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentSelection.prepTime} table prep</span>
            </div>
            <div className="bg-emerald-500/90 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase">
              Fresh KOT
            </div>
          </div>
        </div>

        {/* Right: AI Culinary Details & Actions */}
        <div className="flex-1 flex flex-col justify-between w-full">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-extrabold uppercase text-amber-600 tracking-wider">
                {currentSelection.headline}
              </span>
              <span className="text-xl font-black text-slate-950">
                ₹{currentSelection.price}
              </span>
            </div>

            <h4 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              {currentSelection.dish}
            </h4>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              + Paired with: <span className="text-amber-700 font-bold">{currentSelection.subDish}</span>
            </p>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed bg-amber-50/50 p-3 rounded-2xl border border-amber-100 italic">
              &ldquo;{currentSelection.chefNote}&rdquo;
            </p>

            {/* Flavor Metrics */}
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="bg-slate-50 border border-slate-200/80 p-2 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Spice</span>
                <span className="text-xs font-extrabold text-slate-800">{currentSelection.spiceLevel}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 p-2 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Energy</span>
                <span className="text-xs font-extrabold text-slate-800">{currentSelection.calories}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 p-2 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Order Mode</span>
                <span className="text-xs font-extrabold text-amber-600">Dine-In / Delivery</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => onExploreMenu && onExploreMenu()}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Explore Dish on Live Menu</span>
            </button>
            <button
              onClick={() => {
                if (onSelectDish) onSelectDish(currentSelection);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Save to Favorites</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
