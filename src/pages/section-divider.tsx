import { motion, type Variants } from "framer-motion";

const wrap: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const fade: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

type Props = {
  title: string;
  subtitle?: string;
};

export function SectionDivider({ title, subtitle }: Props) {
  return (
    <motion.div
      className="divider"
      variants={wrap}
      initial="hidden"
      whileInView="visible"
      viewport={{ amount: 0.4 }}
    >
      <motion.span variants={fade} className="divider-rule" />
      <motion.h2 variants={fade} className="divider-title">
        {title}
      </motion.h2>
      {subtitle ? (
        <motion.p variants={fade} className="divider-subtitle">
          {subtitle}
        </motion.p>
      ) : null}
    </motion.div>
  );
}
