import { motion, type Variants } from "framer-motion";

const fade: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// Bibliografía (orden tal como fue proporcionada).
const REFERENCES: string[] = [
  `Aguilar G, et al. Protein binders and their applications in developmental biology. Development. 2019;145(2):dev148874.`,
  `Alberts B, Johnson A, Lewis J, et al. Molecular Biology of the Cell. 6th ed. Garland Science; 2014.`,
  `Alford RF, Leaver-Fay A, Jeliazkov JR, O'Meara MJ, DiMaio FP, et al. The Rosetta all-atom energy function for macromolecular modeling and design. Journal of Chemical Theory and Computation. 2017;13(6):3031–3048. https://doi.org/10.1021/acs.jctc.7b00125`,
  `AlphaFold Protein Structure Database (AFDB). FAQs — PAE JSON ("max_predicted_aligned_error"). AlphaFold DB. Available from: https://alphafold.ebi.ac.uk/faq`,
  `Anand N, Eguchi RR, et al. Illuminating protein space with a programmable generative model (Chroma). Nature. 2023;620:738–745.`,
  `Biology LibreTexts. (2021). 1.17: Protein structure. En BIS 2A: Introductory Biology – Molecules to Cell (Britt). University of California, Davis. Recuperado de https://bio.libretexts.org/`,
  `Black SD, Mould DR. Development of hydrophobicity parameters to analyze proteins which bear post- or cotranslational modifications. Analytical Biochemistry. 1991;193(1):72–82. https://doi.org/10.1016/0003-2697(91)90045-U`,
  `Chennamsetty N, Voynov V, Kayser V, Helk B, Trout BL. Design of therapeutic proteins with enhanced stability. Proceedings of the National Academy of Sciences. 2009;106(29):11937–11942. https://doi.org/10.1073/pnas.0904191106`,
  `Dauparas J, Anishchenko I, Bennett N, et al. Robust deep learning-based protein sequence design using ProteinMPNN. Science. 2022;378(6615):49–56. https://doi.org/10.1126/science.add2187`,
  `Deb K. Multi-Objective Optimization Using Evolutionary Algorithms. John Wiley & Sons; 2001.`,
  `Hinton G, Vinyals O, Dean J. (2015). Distilling the Knowledge in a Neural Network. arXiv:1503.02531. https://arxiv.org/abs/1503.02531`,
  `Hong C, Kortemme T. An integrative approach to protein sequence design through multiobjective optimization. PLoS Computational Biology. 2024;20(7):e1011953.`,
  `Eiben AE, Smith JE. (2003). Introduction to Evolutionary Computing. Berlin: Springer.`,
  `Evans R, O'Neill M, Pritzel A, Antropova N, Senior A, Green T, Žídek A, Bates R, Blackwell S, Yim J, et al. Protein complex prediction with AlphaFold-Multimer. bioRxiv. 2022.`,
  `Ferrara N. VEGF as a therapeutic target in cancer. Nat Rev Cancer. 2002;2(10):795–803. doi:10.1038/nrc909`,
  `Fleishman SJ, Whitehead TA, Ekiert DC, et al. Computational design of proteins targeting the conserved stem region of influenza hemagglutinin. Science. 2011;332(6031):816–821. https://doi.org/10.1126/science.1202617`,
  `Flory PJ. Statistical Mechanics of Chain Molecules. Interscience Publishers, New York; 1969.`,
  `Folkman J. Tumor angiogenesis: therapeutic implications. N Engl J Med. 1971;285(21):1182–1186. doi:10.1056/NEJM197111182852108`,
  `Gamage DG, Gunaratne A, Periyannan GR, Russell TG. Applicability of Instability Index for In vitro Protein Stability Prediction. Protein & Peptide Letters. 2019;26(5):339–347. https://doi.org/10.2174/0929866526666190228144219`,
  `Gasteiger E, Hoogland C, Gattiker A, Duvaud S, Wilkins MR, Appel RD, Bairoch A. Protein Identification and Analysis Tools on the ExPASy Server. In: Walker JM, editor. The Proteomics Protocols Handbook. Humana Press; 2005. p. 571–607.`,
  `Goldberg DE. (1989). Genetic Algorithms in Search, Optimization and Machine Learning. Reading, MA: Addison-Wesley.`,
  `Goudy OJ, Nallathambi A, Kinjo T, Randolph NZ, Kuhlman B. (2023). In silico evolution of autoinhibitory domains for a PD-L1 antagonist using deep learning models. Proceedings of the National Academy of Sciences of the United States of America, 120(49), e2307371120. https://doi.org/10.1073/pnas.2307371120`,
  `Guruprasad K, Reddy BVB, Pandit MW. Correlation between stability of a protein and its dipeptide composition: a novel approach for predicting in vivo stability of a protein from its primary sequence. Protein Engineering, Design and Selection. 1990;4(2):155–161. https://doi.org/10.1093/protein/4.2.155`,
  `Hebditch M, Carballo-Amador MA, Charonis S, Curtis R, Warwicker J. Protein–Sol: A web tool for predicting protein solubility from sequence. Bioinformatics. 2017;33(19):3098–3100. https://doi.org/10.1093/bioinformatics/btx345`,
  `Hougardy S, Wilde M. On the nearest neighbor rule for the metric traveling salesman problem. Discrete Applied Mathematics. 2015;195:101–103. (Preprint: arXiv:1401.2071).`,
  `Huang P-S, Boyken SE, Baker D. The coming of age of de novo protein design. Nature. 2016;537:320–347. https://doi.org/10.1038/nature19946`,
  `Johnson DS, McGeoch LA. The traveling salesman problem: A case study in local optimization. In: Aarts EHL, Lenstra JK, editors. Local Search in Combinatorial Optimization. Wiley; 1997. p. 215–310.`,
  `Jumper J, Evans R, Pritzel A, Green T, Figurnov M, Ronneberger O, et al. Highly accurate protein structure prediction with AlphaFold. Nature. 2021;596(7873):583–589. https://doi.org/10.1038/s41586-021-03819-2`,
  `Kabsch W. A solution for the best rotation to relate two sets of vectors. Acta Crystallographica Section A. 1976;32(5):922–923. https://doi.org/10.1107/S0567739476001873`,
  `Kalenczuk P, Gao M, Dunbrack RL. Rēs ipSAE loquuntur: What's wrong with AlphaFold's ipTM score and how to fix it. bioRxiv. 2025. https://doi.org/10.1101/2025.02.10.637595`,
  `Katoch S, Chauhan SS, Kumar V. A review on genetic algorithm: Past, present, and future. Multimedia Tools and Applications. 2021;80:8091–8126. https://doi.org/10.1007/s11042-020-10139-6`,
  `Kirkpatrick S, Gelatt CD, Vecchi MP. (1983). Optimization by Simulated Annealing. Science, 220(4598), 671–680. https://doi.org/10.1126/science.220.4598.671`,
  `Krissinel E, Henrick K. Inference of macromolecular assemblies from crystalline state. Journal of Molecular Biology. 2007;372(3):774–797. https://doi.org/10.1016/j.jmb.2007.05.022`,
  `Korendovych IV, DeGrado WF. De novo protein design, a retrospective. Quarterly Reviews of Biophysics. 2020;53:e3. https://doi.org/10.1017/S0033583520000013`,
  `Kuriata A, Iglesias V, Pujols J, Kurcinski M, Kmiecik S, et al. AGGRESCAN3D (A3D) 2.0: Prediction and engineering of protein solubility. Nucleic Acids Research. 2019;47(W1):W300–W307. https://doi.org/10.1093/nar/gkz321`,
  `Kyte J, Doolittle RF. A simple method for displaying the hydropathic character of a protein. Journal of Molecular Biology. 1982;157(1):105–132. https://doi.org/10.1016/0022-2836(82)90515-0`,
  `Lawrence MC, Colman PM. Shape complementarity at protein/protein interfaces. Journal of Molecular Biology. 1993;234(4):946–950. https://doi.org/10.1006/jmbi.1993.1648`,
  `Lee B, Richards FM. The interpretation of protein structures: estimation of static accessibility. Journal of Molecular Biology. 1971;55(3):379–400. https://doi.org/10.1016/0022-2836(71)90324-X`,
  `Liang Z, Hu K, Ma X, Zhu Z. A many-objective evolutionary algorithm based on a two-round selection strategy. IEEE Transactions on Cybernetics. 2021;51(3):1417–1429. https://doi.org/10.1109/TCYB.2019.2918087`,
  `Lobanov MY, Bogatyreva NS, Galzitskaya OV. Radius of gyration as an indicator of protein structure compactness. Molecular Biology. 2008;42(4):623–628. https://doi.org/10.1134/S0026893308040195`,
  `Luo J, Ding K, Luo Y. Pareto-optimal sampling for multi-objective protein sequence design. iScience. 2025;28(3):112119. https://doi.org/10.1016/j.isci.2025.112119`,
  `Magaña Gómez PG, Kovalevskiy O. pLDDT: Understanding local confidence. In: AlphaFold: A practical guide. EMBL-EBI Training; 2025. Available from: https://www.ebi.ac.uk/training/online/courses/alphafold/`,
  `Mészáros B, Erdős G, Dosztányi Z. IUPred2A: Context-dependent prediction of protein disorder as a function of redox state and protein binding. Nucleic Acids Research. 2018;46(W1):W329–W337. https://doi.org/10.1093/nar/gky384`,
  `Miettinen K. Nonlinear Multiobjective Optimization. Kluwer Academic Publishers, Boston; 1999. ISBN 978-0-7923-8278-2.`,
  `Mitchell M. (1998). An Introduction to Genetic Algorithms. Cambridge, MA: MIT Press.`,
  `Nanda V, Belure SV, Shir OM. Searching for the Pareto frontier in multi-objective protein design. Biophysical Reviews. 2017;9(4):339–344. https://doi.org/10.1007/s12551-017-0288-0`,
  `Nocedal J, Wright S. Numerical Optimization. Springer; 2006.`,
  `Nori D, Parsan A, Uhler C, Jin W. (2025). BindEnergyCraft: Casting Protein Structure Predictors as Energy-Based Models for Binder Design. arXiv preprint arXiv:2505.21241.`,
  `Pacesa M, Nickel L, Schmidt J, et al. One-shot design of functional protein binders with BindCraft. Nature. 2025. https://doi.org/10.1038/s41586-025-09429-6`,
  `Romero-Romero S, Fernández-Velasco DA, Costas M. (2018). Estabilidad termodinámica de proteínas. Educación Química, 29(3), 3–17. https://doi.org/10.22201/fq.18708404e.2018.3.64699`,
  `PAE Viewer (Universität Göttingen). Documentation. Universität Göttingen. Available from: https://pae-viewer.uni-goettingen.de/`,
  `Pauling L, Corey RB, Branson HR. The structure of proteins: two hydrogen-bonded helical configurations of the polypeptide chain. Proceedings of the National Academy of Sciences. 1951;37(4):205–211. https://doi.org/10.1073/pnas.37.4.205`,
  `Pufall MA, Graves BJ. Autoinhibitory domains: Modular effectors of cellular regulation. Annual Review of Cell and Developmental Biology. 2002;18:421–462.`,
  `Sheffler W, Baker D. RosettaHoles: Rapid assessment of protein core packing for structure prediction, refinement, and validation. Protein Science. 2009;18(1):229–239. https://doi.org/10.1002/pro.8`,
  `Shrake A, Rupley JA. Environment and exposure to solvent of protein atoms. Lysozyme and insulin. Journal of Molecular Biology. 1973;79(2):351–371. https://doi.org/10.1016/0022-2836(73)90011-9`,
  `Sormanni P, Aprile FA, Vendruscolo M. The CamSol method of rational design of protein mutants with enhanced solubility. Journal of Molecular Biology. 2015;427(2):478–490. https://doi.org/10.1016/j.jmb.2014.09.026`,
  `Talbi E-G. (2013). Metaheurísticas: de los algoritmos genéticos a la búsqueda tabú. Barcelona: Reverté.`,
  `Tien MZ, Meyer AG, Sydykova DK, Spielman SJ, Wilke CO. Maximum allowed solvent accessibilities of residues in proteins. PLOS ONE. 2013;8(11):e80635. https://doi.org/10.1371/journal.pone.0080635`,
  `Mariani V, Biasini M, Barbato A, Schwede T. lDDT: A local superposition-free score for comparing protein structures and models using distance difference tests. Bioinformatics. 2013;29(21):2722–2728. https://doi.org/10.1093/bioinformatics/btt473`,
  `Walker SP, Yallapragada VVB, Tangney M. (2021). Arming yourself for the in silico protein design revolution. Trends in Biotechnology, 39(7), 651–664. https://doi.org/10.1016/j.tibtech.2020.10.003`,
  `Watson JL, Juergens D, Bennett NR, Trippe BL, Yim J, Eisenach HE, et al. Broadly applicable and accurate protein design by integrating structure prediction networks and diffusion generative models. Nature. 2023;620:1089–1099.`,
  `Williams CJ, Headd JJ, Moriarty NW, Prisant MG, Videau LL, et al. MolProbity: More and better reference data for improved all-atom structure validation. Protein Science. 2018;27(1):293–315. https://doi.org/10.1002/pro.3330`,
  `Woolfson DN. A brief history of de novo protein design: Minimal, rational, and computational. Journal of Molecular Biology. 2021;433(20):167160.`,
  `Yan J, Li S, Zhang Y, Hao A, Zhao Q. ZetaDesign: An end-to-end deep learning method for protein sequence design and side-chain packing. Briefings in Bioinformatics. 2023;24(4).`,
  `Zambaldi V, La D, Chu AE, et al. De novo design of high-affinity protein binders with AlphaProteo. arXiv preprint. 2024.`,
  `Zhang C, Shine M, Pyle AM, Zhang Y. US-align: universal structure alignments of proteins, nucleic acids, and macromolecular complexes. Nature Methods. 2022;19:1109–1115. https://doi.org/10.1038/s41592-022-01585-1`,
  `Zhang Y, Skolnick J. Scoring function for automated assessment of protein structure template quality. Proteins: Structure, Function, and Bioinformatics. 2004;57(4):702–710. https://doi.org/10.1002/prot.20264`,
];

export function Referencias() {
  return (
    <motion.div
      className="refs"
      variants={fade}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.15 }}
    >
      <h2 className="refs-title">Referencias</h2>
      <ol className="refs-list">
        {REFERENCES.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ol>
    </motion.div>
  );
}
