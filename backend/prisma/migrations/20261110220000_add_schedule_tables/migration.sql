CREATE TABLE IF NOT EXISTS "HorarioFuncionamento" (
    "id" SERIAL NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "horaAbertura" TEXT NOT NULL DEFAULT '08:00',
    "horaFechamento" TEXT NOT NULL DEFAULT '23:00',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HorarioFuncionamento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HorarioFuncionamento_diaSemana_key"
ON "HorarioFuncionamento"("diaSemana");

CREATE TABLE IF NOT EXISTS "BloqueioQuadra" (
    "id" SERIAL NOT NULL,
    "quadraId" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "motivo" TEXT,

    CONSTRAINT "BloqueioQuadra_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'BloqueioQuadra_quadraId_fkey'
    ) THEN
        ALTER TABLE "BloqueioQuadra"
        ADD CONSTRAINT "BloqueioQuadra_quadraId_fkey"
        FOREIGN KEY ("quadraId") REFERENCES "Court"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
