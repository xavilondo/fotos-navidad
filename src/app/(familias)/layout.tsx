import { after } from "next/server";
import { db } from "@/servidor/db";
import { ticOportunista } from "@/servidor/tic";

/** Las pantallas de las familias: una columna de móvil, centrada en pantallas grandes. */
export default function LayoutFamilias({ children }: LayoutProps<"/">) {
  after(() => ticOportunista(db));
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-x-clip">
      {children}
    </div>
  );
}
