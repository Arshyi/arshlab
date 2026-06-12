import type { Ion } from "./types"

export const COMMON_IONS: Ion[] = [
  { id: "ion-hydrogen", name: "hydrogen ion", formula: "H+", charge: "+1", category: "monoatomic cation", aliases: ["proton", "H+"] },
  { id: "ion-lithium", name: "lithium ion", formula: "Li+", charge: "+1", category: "monoatomic cation", aliases: ["Li+"] },
  { id: "ion-sodium", name: "sodium ion", formula: "Na+", charge: "+1", category: "monoatomic cation", aliases: ["Na+"] },
  { id: "ion-potassium", name: "potassium ion", formula: "K+", charge: "+1", category: "monoatomic cation", aliases: ["K+"] },
  { id: "ion-silver", name: "silver ion", formula: "Ag+", charge: "+1", category: "transition metal cation", aliases: ["Ag+", "silver(I)"] },
  { id: "ion-ammonium", name: "ammonium", formula: "NH4+", charge: "+1", category: "polyatomic cation", aliases: ["NH4+", "ammonium ion"] },
  { id: "ion-hydronium", name: "hydronium", formula: "H3O+", charge: "+1", category: "polyatomic cation", aliases: ["H3O+", "oxonium"] },
  { id: "ion-magnesium", name: "magnesium ion", formula: "Mg2+", charge: "+2", category: "monoatomic cation", aliases: ["Mg2+", "Mg^2+"] },
  { id: "ion-calcium", name: "calcium ion", formula: "Ca2+", charge: "+2", category: "monoatomic cation", aliases: ["Ca2+", "Ca^2+"] },
  { id: "ion-strontium", name: "strontium ion", formula: "Sr2+", charge: "+2", category: "monoatomic cation", aliases: ["Sr2+", "Sr^2+"] },
  { id: "ion-barium", name: "barium ion", formula: "Ba2+", charge: "+2", category: "monoatomic cation", aliases: ["Ba2+", "Ba^2+"] },
  { id: "ion-zinc", name: "zinc ion", formula: "Zn2+", charge: "+2", category: "transition metal cation", aliases: ["Zn2+", "Zn^2+"] },
  { id: "ion-copper-i", name: "copper(I)", formula: "Cu+", charge: "+1", category: "transition metal cation", aliases: ["Cu+", "cuprous ion"] },
  { id: "ion-copper-ii", name: "copper(II)", formula: "Cu2+", charge: "+2", category: "transition metal cation", aliases: ["Cu2+", "Cu^2+", "cupric ion"] },
  { id: "ion-iron-ii", name: "iron(II)", formula: "Fe2+", charge: "+2", category: "transition metal cation", aliases: ["Fe2+", "Fe^2+", "ferrous ion"] },
  { id: "ion-iron-iii", name: "iron(III)", formula: "Fe3+", charge: "+3", category: "transition metal cation", aliases: ["Fe3+", "Fe^3+", "ferric ion"] },
  { id: "ion-aluminum", name: "aluminum ion", formula: "Al3+", charge: "+3", category: "monoatomic cation", aliases: ["Al3+", "Al^3+"] },
  { id: "ion-lead-ii", name: "lead(II)", formula: "Pb2+", charge: "+2", category: "post-transition metal cation", aliases: ["Pb2+", "Pb^2+", "plumbous ion"] },
  { id: "ion-tin-ii", name: "tin(II)", formula: "Sn2+", charge: "+2", category: "post-transition metal cation", aliases: ["Sn2+", "Sn^2+"] },
  { id: "ion-tin-iv", name: "tin(IV)", formula: "Sn4+", charge: "+4", category: "post-transition metal cation", aliases: ["Sn4+", "Sn^4+"] },
  { id: "ion-fluoride", name: "fluoride", formula: "F-", charge: "-1", category: "monoatomic anion", aliases: ["F-", "fluoride ion"] },
  { id: "ion-chloride", name: "chloride", formula: "Cl-", charge: "-1", category: "monoatomic anion", aliases: ["Cl-", "chloride ion"] },
  { id: "ion-bromide", name: "bromide", formula: "Br-", charge: "-1", category: "monoatomic anion", aliases: ["Br-", "bromide ion"] },
  { id: "ion-iodide", name: "iodide", formula: "I-", charge: "-1", category: "monoatomic anion", aliases: ["I-", "iodide ion"] },
  { id: "ion-oxide", name: "oxide", formula: "O2-", charge: "-2", category: "monoatomic anion", aliases: ["O2-", "O^2-"] },
  { id: "ion-sulfide", name: "sulfide", formula: "S2-", charge: "-2", category: "monoatomic anion", aliases: ["S2-", "S^2-"] },
  { id: "ion-nitride", name: "nitride", formula: "N3-", charge: "-3", category: "monoatomic anion", aliases: ["N3-", "N^3-"] },
  { id: "ion-hydroxide", name: "hydroxide", formula: "OH-", charge: "-1", category: "polyatomic anion", aliases: ["OH-", "hydroxide ion"] },
  { id: "ion-nitrate", name: "nitrate", formula: "NO3-", charge: "-1", category: "polyatomic anion", aliases: ["NO3-", "nitrate ion"] },
  { id: "ion-nitrite", name: "nitrite", formula: "NO2-", charge: "-1", category: "polyatomic anion", aliases: ["NO2-", "nitrite ion"] },
  { id: "ion-sulfate", name: "sulfate", formula: "SO4^2-", charge: "-2", category: "polyatomic anion", aliases: ["SO4^2-", "SO42-", "sulfate ion"] },
  { id: "ion-sulfite", name: "sulfite", formula: "SO3^2-", charge: "-2", category: "polyatomic anion", aliases: ["SO3^2-", "SO32-", "sulfite ion"] },
  { id: "ion-hydrogen-sulfate", name: "hydrogen sulfate", formula: "HSO4-", charge: "-1", category: "polyatomic anion", aliases: ["HSO4-", "bisulfate"] },
  { id: "ion-carbonate", name: "carbonate", formula: "CO3^2-", charge: "-2", category: "polyatomic anion", aliases: ["CO3^2-", "CO32-", "carbonate ion"] },
  { id: "ion-hydrogen-carbonate", name: "hydrogen carbonate", formula: "HCO3-", charge: "-1", category: "polyatomic anion", aliases: ["HCO3-", "bicarbonate"] },
  { id: "ion-phosphate", name: "phosphate", formula: "PO4^3-", charge: "-3", category: "polyatomic anion", aliases: ["PO4^3-", "PO43-", "phosphate ion"] },
  { id: "ion-hydrogen-phosphate", name: "hydrogen phosphate", formula: "HPO4^2-", charge: "-2", category: "polyatomic anion", aliases: ["HPO4^2-", "HPO42-"] },
  { id: "ion-dihydrogen-phosphate", name: "dihydrogen phosphate", formula: "H2PO4-", charge: "-1", category: "polyatomic anion", aliases: ["H2PO4-"] },
  { id: "ion-acetate", name: "ethanoate", formula: "CH3COO-", charge: "-1", category: "polyatomic anion", aliases: ["acetate", "C2H3O2-", "ethanoate ion"] },
  { id: "ion-permanganate", name: "permanganate", formula: "MnO4-", charge: "-1", category: "polyatomic anion", aliases: ["MnO4-", "permanganate ion"] },
  { id: "ion-dichromate", name: "dichromate", formula: "Cr2O7^2-", charge: "-2", category: "polyatomic anion", aliases: ["Cr2O7^2-", "Cr2O72-", "dichromate ion"] },
  { id: "ion-chromate", name: "chromate", formula: "CrO4^2-", charge: "-2", category: "polyatomic anion", aliases: ["CrO4^2-", "CrO42-", "chromate ion"] },
  { id: "ion-cyanide", name: "cyanide", formula: "CN-", charge: "-1", category: "polyatomic anion", aliases: ["CN-", "cyanide ion"] },
  { id: "ion-thiocyanate", name: "thiocyanate", formula: "SCN-", charge: "-1", category: "polyatomic anion", aliases: ["SCN-", "thiocyanate ion"] },
  { id: "ion-oxalate", name: "oxalate", formula: "C2O4^2-", charge: "-2", category: "polyatomic anion", aliases: ["C2O4^2-", "oxalate ion"] },
  { id: "ion-thiosulfate", name: "thiosulfate", formula: "S2O3^2-", charge: "-2", category: "polyatomic anion", aliases: ["S2O3^2-", "thiosulfate ion"] },
  { id: "ion-hypochlorite", name: "hypochlorite", formula: "ClO-", charge: "-1", category: "polyatomic anion", aliases: ["ClO-", "hypochlorite ion"] },
  { id: "ion-chlorate", name: "chlorate", formula: "ClO3-", charge: "-1", category: "polyatomic anion", aliases: ["ClO3-", "chlorate ion"] },
  { id: "ion-perchlorate", name: "perchlorate", formula: "ClO4-", charge: "-1", category: "polyatomic anion", aliases: ["ClO4-", "perchlorate ion"] },
  { id: "ion-peroxide", name: "peroxide", formula: "O2^2-", charge: "-2", category: "polyatomic anion", aliases: ["O2^2-", "peroxide ion"] },
  { id: "ion-silicate", name: "silicate", formula: "SiO3^2-", charge: "-2", category: "polyatomic anion", aliases: ["SiO3^2-", "silicate ion"] },
  { id: "ion-borate", name: "borate", formula: "BO3^3-", charge: "-3", category: "polyatomic anion", aliases: ["BO3^3-", "borate ion"] },
]

export function getCommonIon(query: string): Ion | undefined {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, "")
  return COMMON_IONS.find(
    (ion) =>
      ion.name.toLowerCase().replace(/\s+/g, "") === normalized ||
      ion.formula.toLowerCase().replace(/\s+/g, "") === normalized ||
      ion.aliases?.some((alias) => alias.toLowerCase().replace(/\s+/g, "") === normalized),
  )
}
