import { motion } from "framer-motion";
import { Layout } from "@/components/Layout";

export default function Splash() {
  return (
    <Layout showNav={false}>
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/hero-splash.png`}
          alt="MEET App Background"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>
      
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-6xl font-black tracking-tighter text-white drop-shadow-2xl">
            ME<span className="text-primary">E</span>T
          </h1>
          <p className="mt-4 text-lg font-medium text-white/70 uppercase tracking-widest">
            Авто комьюнити
          </p>
        </motion.div>
        
        <motion.div 
          className="mt-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-glow mx-auto" />
        </motion.div>
      </div>
    </Layout>
  );
}
