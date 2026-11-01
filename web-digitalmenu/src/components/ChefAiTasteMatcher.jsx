import React, { useState, useEffect } from "react";
import { Sparkles, Bot, Utensils, Flame, Leaf, Clock, ArrowRight, Heart, RefreshCw, Zap, Award, Compass, ThumbsUp } from "lucide-react";

export default function ChefAiTasteMatcher({ onSelectDish, onExploreMenu }) {
  const [selectedMood, setSelectedMood] = useState("cheesy");
  const [customQuery, setCustomQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
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
      flavorRadar: { sweetness: 35, savory: 95, umami: 98, crispness: 88, richness: 92 },
      neuralIngredients: ["Buffalo Mozzarella", "Black Truffle Oil", "San Marzano", "Charred Sourdough Crust"],
      chefNote: "Fresh Buffalo Mozzarella stretched daily, baked at 450°C with Italian black truffle oil and slow-simmered San Marzano tomato reduction.",
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
      flavorRadar: { sweetness: 20, savory: 90, umami: 85, crispness: 98, richness: 75 },
      neuralIngredients: ["Birds Eye Chili", "Smoked Paprika", "Garlic Emulsion", "Crisp Crumb Coating"],
      chefNote: "Double-crunch hand-tossed wings tossed in a 24-hr fermented peri-peri reduction with charred lime and herb crema.",
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
      flavorRadar: { sweetness: 40, savory: 80, umami: 75, crispness: 85, richness: 45 },
      neuralIngredients: ["Free-Range Herb Breast", "Tri-Color Quinoa", "Hass Avocado", "Citrus Vinaigrette"],
      chefNote: "Rosemary and cold-pressed extra virgin olive oil marinade, served over tri-color quinoa and organic baby greens.",
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
      flavorRadar: { sweetness: 85, savory: 55, umami: 50, crispness: 90, richness: 60 },
      neuralIngredients: ["Alphonso & Passion Fruit", "Bruised Mint", "Sparkling Ginger Ale", "Cypriot Halloumi"],
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
      flavorRadar: { sweetness: 98, savory: 15, umami: 40, crispness: 45, richness: 99 },
      neuralIngredients: ["70% Callebaut Dark Cocoa", "Madagascar Vanilla", "Organic Raspberry Coulis", "Sea Salt Flakes"],
      chefNote: "70% Single-origin Callebaut Belgian dark chocolate molten core topped with Madagascar bourbon vanilla and fresh berries.",
      image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80"
    }
  ];

  const currentSelection = aiResult || moodPresets.find(m => m.id === selectedMood) || moodPresets[0];

  const handleSelectMood = (preset) => {
    setIsAnalyzing(true);
    setAnalysisStep(1);
    setSelectedMood(preset.id);
    setAiResult(null);

    setTimeout(() => setAnalysisStep(2), 200);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisStep(0);
    }, 450);
  };

  const handleCustomAiSearch = (e) => {
    e.preventDefault();
    if (!customQuery.trim()) return;
    setIsAnalyzing(true);
    setAnalysisStep(1);
    setTimeout(() => setAnalysisStep(2), 300);
    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalysisStep(0);
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
        flavorRadar: { sweetness: 50, savory: 92, umami: 95, crispness: 80, richness: 85 },
        neuralIngredients: ["Black Garlic", "Heritage Tomatoes", "Cold Pressed EVOO", "Rosemary Infusion"],
        chefNote: `Based on your request "${customQuery}", our neural culinary engine curated this balanced flavor synthesis for your dining table.`,
        image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80"
      });
    }, 700);
  };

  return (
    <div className="bg-gradient-to-br from-amber-500/15 via-white to-amber-500/10 rounded-3xl border-2 border-amber-300/80 p-6 md:p-8 shadow-2xl shadow-amber-500/10 relative overflow-hidden">
      {/* ── AI Animated Background Particles & Glow ── */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-400/25 via-orange-400/15 to-transparent rounded-full blur-3xl pointer-events-none -mr-24 -mt-24 animate-pulse-glow" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-emerald-400/20 via-teal-300/10 to-transparent rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Top AI Badge and Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-black uppercase tracking-wider mb-2.5 shadow-md shadow-amber-500/20">
            <Bot className="w-4 h-4 text-slate-950 animate-bounce" />
            <span>Interactive Chef AI Sommelier</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>What Are You Craving?</span>
            <span className="text-amber-600">Let AI Pair It.</span>
          </h3>
          <p className="text-xs md:text-sm text-slate-600 mt-1 max-w-xl">
            Our culinary neural engine pairs flavor profiles, spice meters, and drink pairings in real time for your guests.
          </p>
        </div>

        {/* Quick NLP Custom Search Form */}
        <form onSubmit={handleCustomAiSearch} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="e.g. craving crispy spicy wings & mocktail..."
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              className="w-full bg-white border border-amber-300 text-slate-900 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
            <Sparkles className="w-4 h-4 text-amber-500 absolute right-3.5 top-3.5 pointer-events-none animate-spin-slow" />
          </div>
          <button
            type="submit"
            disabled={isAnalyzing}
            className="bg-slate-950 hover:bg-slate-800 text-white font-black px-5 py-3 rounded-2xl text-xs flex items-center gap-2 transition active:scale-95 shadow-lg shadow-slate-950/20 flex-shrink-0"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Bot className="w-4 h-4 text-amber-400" />
            )}
            <span>Ask Chef AI</span>
          </button>
        </form>
      </div>

      {/* Mood Selector Buttons with Glow Effects */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-3 scrollbar-none relative z-10 mb-6">
        {moodPresets.map((preset) => {
          const isActive = selectedMood === preset.id && !aiResult;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelectMood(preset)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 flex-shrink-0 ${
                isActive
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/30 scale-105"
                  : "bg-white text-slate-700 hover:bg-amber-50 hover:border-amber-300 border border-slate-200"
              }`}
            >
              <span>{preset.label}</span>
              {isActive && <Sparkles className="w-3 h-3 text-slate-950" />}
            </button>
          );
        })}
      </div>

      {/* ── AI Main Interactive Showcase Canvas ── */}
      <div className="relative z-10 bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-xl flex flex-col lg:flex-row gap-8 items-center">
        
        {/* Left Column: Animated Dish Platter with Steam and Real-Time Taste Radar */}
        <div className="w-full lg:w-80 flex flex-col items-center flex-shrink-0">
          <div className="relative w-full h-60 rounded-3xl overflow-hidden shadow-2xl group border-2 border-amber-200">
            <img
              src={currentSelection.image}
              alt={currentSelection.dish}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
            
            {/* Animated Rising Steam Indicator */}
            <div className="absolute top-3 right-3 bg-slate-950/70 backdrop-blur-md text-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 border border-amber-400/30">
              <span className="animate-aroma-steam">♨️</span>
              <span>Aroma Rising</span>
            </div>

            {/* Match percentage badge with pulse */}
            <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-slate-950" />
              <span>{currentSelection.matchScore} TASTE MATCH</span>
            </div>

            {/* Bottom details */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-bold">
              <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentSelection.prepTime} Table Prep</span>
              </div>
              <div className="bg-emerald-500 text-slate-950 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase">
                Active in Kitchen
              </div>
            </div>
          </div>

          {/* AI Ingredient Neural Path Tags */}
          <div className="mt-4 w-full">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
              🧬 AI Neural Ingredients:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {currentSelection.neuralIngredients?.map((ing, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {ing}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Taste Profile Metrics & Interactive Pairing Engine */}
        <div className="flex-1 flex flex-col justify-between w-full">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase text-amber-600 tracking-wider bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  {currentSelection.headline}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Chef Certified
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-slate-950">₹{currentSelection.price}</span>
                <span className="text-[10px] text-slate-400 block font-medium">Taxes included</span>
              </div>
            </div>

            <h4 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1">
              {currentSelection.dish}
            </h4>
            <p className="text-xs md:text-sm font-semibold text-slate-600 mt-1 flex items-center gap-2">
              <span>✨ Recommended Pairing:</span>
              <span className="text-amber-700 font-bold bg-amber-100/70 px-2 py-0.5 rounded-lg">{currentSelection.subDish}</span>
            </p>

            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 border border-amber-200/90 relative">
              <div className="flex items-center gap-2 mb-1 text-[11px] font-black text-amber-900 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Chef AI Tasting Rationale</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed italic">
                &ldquo;{currentSelection.chefNote}&rdquo;
              </p>
            </div>

            {/* ── Animated AI Flavor Radar Dial ── */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-3 block flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-600" />
                <span>Real-Time Flavor Radar Synthesis</span>
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Savory</span>
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${currentSelection.flavorRadar?.savory || 85}%` }} 
                    />
                  </div>
                  <span className="text-xs font-black text-slate-900 mt-1 block">{currentSelection.flavorRadar?.savory || 85}%</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Umami</span>
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="bg-orange-500 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${currentSelection.flavorRadar?.umami || 90}%` }} 
                    />
                  </div>
                  <span className="text-xs font-black text-slate-900 mt-1 block">{currentSelection.flavorRadar?.umami || 90}%</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Crispness</span>
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${currentSelection.flavorRadar?.crispness || 80}%` }} 
                    />
                  </div>
                  <span className="text-xs font-black text-slate-900 mt-1 block">{currentSelection.flavorRadar?.crispness || 80}%</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Richness</span>
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="bg-amber-600 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${currentSelection.flavorRadar?.richness || 85}%` }} 
                    />
                  </div>
                  <span className="text-xs font-black text-slate-900 mt-1 block">{currentSelection.flavorRadar?.richness || 85}%</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Calories</span>
                  <span className="text-xs font-black text-amber-600 mt-2 block">{currentSelection.calories}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Action CTAs */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onExploreMenu && onExploreMenu()}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-6 py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition"
            >
              <Utensils className="w-4 h-4 text-slate-950" />
              <span>Order This Dish On Live Menu</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (onSelectDish) onSelectDish(currentSelection);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-3 rounded-2xl text-xs flex items-center gap-1.5 transition"
            >
              <ThumbsUp className="w-4 h-4 text-amber-600" />
              <span>Great Match</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
